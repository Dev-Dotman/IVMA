import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Sale from '@/models/Sale';
import ItemSale from '@/models/ItemSale';
import Inventory from '@/models/Inventory';
import InventoryBatch from '@/models/InventoryBatch';
import InventoryActivity from '@/models/InventoryActivity';
import { verifySession } from '@/lib/auth';
import { ActivityTracker } from '@/lib/activityTracker';

// POST - Process a new sale with batch tracking
export async function POST(req) {
  try {
    await connectToDatabase();
    
    const user = await verifySession(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const saleData = await req.json();
    
    // Determine if this is an order processing or regular POS sale
    const isOrderProcessing = saleData.isOrderProcessing || saleData.isFromOrder || false;
    
    // Start a session for transaction
    const session = await mongoose.startSession();
    
    try {
      await session.startTransaction();

      // Process each item with batch tracking
      const processedItems = [];
      const itemSales = [];
      let totalBatchesUsed = 0;
      let totalCostFromBatches = 0;
      let totalProfitFromBatches = 0;

      for (const item of saleData.items) {
        const result = await processItemWithBatchTracking(item, user._id, session, isOrderProcessing);
        processedItems.push(result.processedItem);
        if (result.itemSale) {
          itemSales.push(result.itemSale);
        }
        totalBatchesUsed += result.batchesUsed;
        totalCostFromBatches += result.totalCost;
        totalProfitFromBatches += result.totalProfit;
      }

      // Calculate average cost per unit
      const totalQuantitySold = processedItems.reduce((sum, item) => sum + item.quantity, 0);
      const averageCostPerUnit = totalQuantitySold > 0 ? totalCostFromBatches / totalQuantitySold : 0;

      // Create the sale with proper batch tracking
      const processedSaleData = {
        ...saleData,
        userId: user._id,
        soldBy: user._id,
        items: processedItems,
        subtotal: Number(saleData.subtotal) || 0,
        discount: Number(saleData.discount) || 0,
        tax: Number(saleData.tax) || 0,
        total: Number(saleData.total) || 0,
        amountReceived: Number(saleData.amountReceived) || 0,
        balance: Number(saleData.balance) || 0,
        // Add batch summary
        batchSummary: {
          totalBatchesUsed,
          totalCostFromBatches,
          totalProfitFromBatches,
          averageCostPerUnit
        }
      };

      // Create the sale
      const sale = new Sale(processedSaleData);
      await sale.save({ session });

      // Update item sales with transaction reference
      for (const itemSale of itemSales) {
        itemSale.saleTransactionId = sale._id;
        await itemSale.save({ session });
      }

      await session.commitTransaction();

      console.log('Sale created successfully with batch tracking:', {
        id: sale._id,
        transactionId: sale.transactionId,
        total: sale.total,
        batchesUsed: totalBatchesUsed,
        isOrderProcessing
      });

      return NextResponse.json({
        success: true,
        message: 'Sale recorded successfully with batch tracking',
        data: {
          _id: sale._id,
          transactionId: sale.transactionId,
          total: sale.total,
          subtotal: sale.subtotal,
          saleDate: sale.saleDate,
          status: sale.status,
          batchSummary: sale.batchSummary
        }
      });

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }

  } catch (error) {
    console.error('Sale creation error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { success: false, message: messages.join(', ') },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to process items with batch tracking and variant information
async function processItemWithBatchTracking(saleItem, userId, session, isOrderProcessing = false) {
  // Get the inventory item with all details
  const inventoryItem = await Inventory.findById(saleItem.inventoryId).session(session);
  if (!inventoryItem) {
    throw new Error(`Inventory item not found: ${saleItem.inventoryId}`);
  }

  // Extract variant information if present
  let variantInfo = null;
  let selectedVariant = null;
  
  if (saleItem.variant && saleItem.variant.size && saleItem.variant.color) {
    // Find the specific variant
    selectedVariant = inventoryItem.getVariant(saleItem.variant.size, saleItem.variant.color);
    
    if (!selectedVariant) {
      throw new Error(`Variant ${saleItem.variant.color} - ${saleItem.variant.size} not found for ${inventoryItem.productName}`);
    }
    
    // Only check stock for regular POS sales
    if (!isOrderProcessing && selectedVariant.quantityInStock < saleItem.quantity) {
      throw new Error(`Insufficient stock for variant ${saleItem.variant.color} - ${saleItem.variant.size}. Available: ${selectedVariant.quantityInStock}, Requested: ${saleItem.quantity}`);
    }
    
    variantInfo = {
      hasVariant: true,
      size: saleItem.variant.size,
      color: saleItem.variant.color,
      variantSku: selectedVariant.sku,
      variantId: selectedVariant._id,
      images: selectedVariant.images || []
    };
  } else {
    // Non-variant item - check main stock
    if (!isOrderProcessing && inventoryItem.quantityInStock < saleItem.quantity) {
      throw new Error(`Insufficient stock for ${inventoryItem.productName}. Available: ${inventoryItem.quantityInStock}, Requested: ${saleItem.quantity}`);
    }
    
    variantInfo = {
      hasVariant: false,
      size: null,
      color: null,
      variantSku: null,
      variantId: null,
      images: []
    };
  }

  // Get available batches - filter by variant if applicable
  let batchQuery = {
    productId: saleItem.inventoryId,
    userId: userId,
    status: 'active',
    quantityRemaining: { $gt: 0 }
  };
  
  // If item has variants and we're looking for a specific variant
  if (variantInfo.hasVariant) {
    batchQuery.hasVariants = true;
    batchQuery['variants.size'] = variantInfo.size;
    batchQuery['variants.color'] = variantInfo.color;
    batchQuery['variants.quantityRemaining'] = { $gt: 0 };
  }
  
  const availableBatches = await InventoryBatch.find(batchQuery)
    .sort({ dateReceived: 1 }) // FIFO - First In, First Out
    .session(session);

  let totalCost = 0;
  let totalProfit = 0;
  let batchesUsed = 0;
  const batchesSoldFrom = [];

  if (availableBatches.length > 0) {
    // Process quantity from batches using FIFO
    let remainingQuantity = saleItem.quantity;

    for (const batch of availableBatches) {
      if (remainingQuantity <= 0) break;

      let quantityFromThisBatch = 0;
      let costPriceFromBatch = batch.costPrice;
      
      if (variantInfo.hasVariant && batch.hasVariants) {
        // Get the specific variant from the batch
        const batchVariant = batch.getVariant(variantInfo.size, variantInfo.color);
        
        if (batchVariant && batchVariant.quantityRemaining > 0) {
          quantityFromThisBatch = Math.min(remainingQuantity, batchVariant.quantityRemaining);
          
          // Only update batch quantities for regular POS sales
          if (!isOrderProcessing) {
            await batch.sellFromBatch(quantityFromThisBatch, variantInfo.size, variantInfo.color);
          }
          
          // Track batch usage with variant info
          batchesSoldFrom.push({
            batchId: batch._id,
            batchCode: batch.batchCode,
            quantityFromBatch: quantityFromThisBatch,
            costPriceFromBatch: costPriceFromBatch,
            batchVariant: {
              size: variantInfo.size,
              color: variantInfo.color,
              variantSku: variantInfo.variantSku
            }
          });
        }
      } else {
        // Non-variant batch
        quantityFromThisBatch = Math.min(remainingQuantity, batch.quantityRemaining);
        
        // Only update batch quantities for regular POS sales
        if (!isOrderProcessing) {
          batch.quantitySold += quantityFromThisBatch;
          batch.quantityRemaining -= quantityFromThisBatch;
          
          if (batch.quantityRemaining === 0) {
            batch.status = 'depleted';
          }
          
          await batch.save({ session });
        }
        
        batchesSoldFrom.push({
          batchId: batch._id,
          batchCode: batch.batchCode,
          quantityFromBatch: quantityFromThisBatch,
          costPriceFromBatch: costPriceFromBatch
        });
      }

      const costFromThisBatch = quantityFromThisBatch * costPriceFromBatch;
      const profitFromThisBatch = quantityFromThisBatch * (saleItem.unitPrice - costPriceFromBatch);
      
      totalCost += costFromThisBatch;
      totalProfit += profitFromThisBatch;
      batchesUsed++;
      remainingQuantity -= quantityFromThisBatch;
    }

    if (remainingQuantity > 0) {
      // Fallback to inventory cost price for remaining quantity
      const fallbackCost = remainingQuantity * inventoryItem.costPrice;
      const fallbackProfit = remainingQuantity * (saleItem.unitPrice - inventoryItem.costPrice);
      totalCost += fallbackCost;
      totalProfit += fallbackProfit;
      console.warn(`Used fallback pricing for ${remainingQuantity} units of ${inventoryItem.productName}`);
    }
  } else {
    // No batches available, use inventory cost price
    totalCost = saleItem.quantity * inventoryItem.costPrice;
    totalProfit = saleItem.quantity * (saleItem.unitPrice - inventoryItem.costPrice);
    console.warn(`No batches found for ${inventoryItem.productName}, using inventory cost price`);
  }

  // Only update inventory quantities for regular POS sales
  if (!isOrderProcessing) {
    if (variantInfo.hasVariant && selectedVariant) {
      // Update variant stock
      await inventoryItem.recordVariantSale(variantInfo.size, variantInfo.color, saleItem.quantity);
    } else {
      // Update main inventory stock
      await inventoryItem.recordSale(saleItem.quantity);
    }
  }

  // Capture category-specific details at time of sale
  const categoryDetails = {
    category: inventoryItem.category
  };
  
  // Add category-specific details based on product category
  if (inventoryItem.category === 'Clothing' && inventoryItem.clothingDetails) {
    categoryDetails.clothingDetails = {
      gender: inventoryItem.clothingDetails.gender,
      productType: inventoryItem.clothingDetails.productType,
      material: inventoryItem.clothingDetails.material,
      style: inventoryItem.clothingDetails.style,
      occasion: inventoryItem.clothingDetails.occasion
    };
  } else if (inventoryItem.category === 'Shoes' && inventoryItem.shoesDetails) {
    categoryDetails.shoesDetails = {
      gender: inventoryItem.shoesDetails.gender,
      shoeType: inventoryItem.shoesDetails.shoeType,
      material: inventoryItem.shoesDetails.material,
      occasion: inventoryItem.shoesDetails.occasion
    };
  } else if (inventoryItem.category === 'Accessories' && inventoryItem.accessoriesDetails) {
    categoryDetails.accessoriesDetails = {
      accessoryType: inventoryItem.accessoriesDetails.accessoryType,
      gender: inventoryItem.accessoriesDetails.gender,
      material: inventoryItem.accessoriesDetails.material
    };
  } else if (inventoryItem.category === 'Perfumes' && inventoryItem.perfumeDetails) {
    categoryDetails.perfumeDetails = {
      fragranceType: inventoryItem.perfumeDetails.fragranceType,
      gender: inventoryItem.perfumeDetails.gender,
      volume: inventoryItem.perfumeDetails.volume,
      scentFamily: inventoryItem.perfumeDetails.scentFamily,
      concentration: inventoryItem.perfumeDetails.concentration,
      occasion: inventoryItem.perfumeDetails.occasion
    };
  } else if (inventoryItem.category === 'Food' && inventoryItem.foodDetails) {
    categoryDetails.foodDetails = {
      foodType: inventoryItem.foodDetails.foodType,
      cuisineType: inventoryItem.foodDetails.cuisineType,
      servingSize: inventoryItem.foodDetails.servingSize,
      spiceLevel: inventoryItem.foodDetails.spiceLevel,
      allergens: inventoryItem.foodDetails.allergens
    };
  } else if (inventoryItem.category === 'Beverages' && inventoryItem.beveragesDetails) {
    categoryDetails.beveragesDetails = {
      beverageType: inventoryItem.beveragesDetails.beverageType,
      volume: inventoryItem.beveragesDetails.volume,
      packaging: inventoryItem.beveragesDetails.packaging,
      isAlcoholic: inventoryItem.beveragesDetails.isAlcoholic,
      isCarbonated: inventoryItem.beveragesDetails.isCarbonated,
      flavorProfile: inventoryItem.beveragesDetails.flavorProfile
    };
  } else if (inventoryItem.category === 'Electronics' && inventoryItem.electronicsDetails) {
    categoryDetails.electronicsDetails = {
      productType: inventoryItem.electronicsDetails.productType,
      brand: inventoryItem.electronicsDetails.brand,
      model: inventoryItem.electronicsDetails.model,
      condition: inventoryItem.electronicsDetails.condition,
      warranty: inventoryItem.electronicsDetails.warranty
    };
  } else if (inventoryItem.category === 'Books' && inventoryItem.booksDetails) {
    categoryDetails.booksDetails = {
      bookType: inventoryItem.booksDetails.bookType,
      author: inventoryItem.booksDetails.author,
      publisher: inventoryItem.booksDetails.publisher,
      isbn: inventoryItem.booksDetails.isbn,
      format: inventoryItem.booksDetails.format,
      condition: inventoryItem.booksDetails.condition
    };
  } else if (inventoryItem.category === 'Home & Garden' && inventoryItem.homeGardenDetails) {
    categoryDetails.homeGardenDetails = {
      productType: inventoryItem.homeGardenDetails.productType,
      room: inventoryItem.homeGardenDetails.room,
      material: inventoryItem.homeGardenDetails.material,
      assemblyRequired: inventoryItem.homeGardenDetails.assemblyRequired
    };
  } else if (inventoryItem.category === 'Sports' && inventoryItem.sportsDetails) {
    categoryDetails.sportsDetails = {
      sportType: inventoryItem.sportsDetails.sportType,
      productType: inventoryItem.sportsDetails.productType,
      brand: inventoryItem.sportsDetails.brand,
      performanceLevel: inventoryItem.sportsDetails.performanceLevel
    };
  } else if (inventoryItem.category === 'Automotive' && inventoryItem.automotiveDetails) {
    categoryDetails.automotiveDetails = {
      productType: inventoryItem.automotiveDetails.productType,
      brand: inventoryItem.automotiveDetails.brand,
      partNumber: inventoryItem.automotiveDetails.partNumber,
      condition: inventoryItem.automotiveDetails.condition,
      compatibleVehicles: inventoryItem.automotiveDetails.compatibleVehicles
    };
  } else if (inventoryItem.category === 'Health & Beauty' && inventoryItem.healthBeautyDetails) {
    categoryDetails.healthBeautyDetails = {
      productType: inventoryItem.healthBeautyDetails.productType,
      brand: inventoryItem.healthBeautyDetails.brand,
      skinType: inventoryItem.healthBeautyDetails.skinType,
      volume: inventoryItem.healthBeautyDetails.volume,
      scent: inventoryItem.healthBeautyDetails.scent,
      isOrganic: inventoryItem.healthBeautyDetails.isOrganic
    };
  }

  // Create inventory activity with appropriate type and metadata
  await InventoryActivity.createActivity({
    userId: userId,
    inventoryId: saleItem.inventoryId,
    activityType: isOrderProcessing ? 'order_processed' : 'stock_removed',
    description: variantInfo.hasVariant
      ? `${isOrderProcessing ? 'Order processed' : 'Sold'}: ${saleItem.quantity} ${inventoryItem.unitOfMeasure} (${variantInfo.color} - ${variantInfo.size})${isOrderProcessing ? ' (no stock deduction)' : ' via POS'}`
      : `${isOrderProcessing ? 'Order processed' : 'Sold'}: ${saleItem.quantity} ${inventoryItem.unitOfMeasure}${isOrderProcessing ? ' (no stock deduction)' : ' via POS'}`,
    stockMovement: isOrderProcessing ? null : {
      type: 'subtract',
      quantity: saleItem.quantity,
      reason: 'POS Sale',
      previousStock: variantInfo.hasVariant ? selectedVariant.quantityInStock + saleItem.quantity : inventoryItem.quantityInStock + saleItem.quantity,
      newStock: variantInfo.hasVariant ? selectedVariant.quantityInStock : inventoryItem.quantityInStock,
      variant: variantInfo.hasVariant ? {
        size: variantInfo.size,
        color: variantInfo.color,
        sku: variantInfo.variantSku
      } : null
    },
    metadata: {
      saleType: isOrderProcessing ? 'order_processing' : 'pos',
      stockDeducted: !isOrderProcessing,
      isOrderProcessing: isOrderProcessing,
      hasVariant: variantInfo.hasVariant,
      variant: variantInfo.hasVariant ? {
        size: variantInfo.size,
        color: variantInfo.color,
        sku: variantInfo.variantSku
      } : null,
      batchesUsed: batchesSoldFrom.map(b => ({
        batchCode: b.batchCode,
        quantity: b.quantityFromBatch,
        variant: b.batchVariant
      }))
    }
  });

  // Create ItemSale record if we have batch data
  let itemSale = null;
  if (batchesSoldFrom.length > 0) {
    itemSale = new ItemSale({
      userId: userId,
      inventoryId: saleItem.inventoryId,
      batchesSoldFrom: batchesSoldFrom.map(batch => ({
        batchId: batch.batchId,
        batchCode: batch.batchCode,
        quantitySoldFromBatch: batch.quantityFromBatch,
        unitCostPriceFromBatch: batch.costPriceFromBatch,
        batchDateReceived: availableBatches.find(b => b._id.equals(batch.batchId))?.dateReceived,
        batchSupplier: availableBatches.find(b => b._id.equals(batch.batchId))?.supplier || ''
      })),
      itemSnapshot: {
        productName: inventoryItem.productName,
        sku: inventoryItem.sku,
        category: inventoryItem.category,
        brand: inventoryItem.brand || '',
        unitOfMeasure: inventoryItem.unitOfMeasure
      },
      quantitySold: saleItem.quantity,
      unitSalePrice: saleItem.unitPrice,
      totalSaleAmount: saleItem.total,
      unitCostPrice: totalCost / saleItem.quantity,
      totalCostAmount: totalCost,
      paymentMethod: 'pos',
      saleDate: new Date(),
      status: 'completed',
      soldBy: userId,
      saleLocation: isOrderProcessing ? 'Order Processing' : 'POS Terminal',
      notes: isOrderProcessing ? 'Order Processing Sale' : 'POS Sale',
      metadata: {
        isOrderProcessing: isOrderProcessing,
        stockDeducted: !isOrderProcessing,
        hasVariant: variantInfo.hasVariant,
        variant: variantInfo.hasVariant ? {
          size: variantInfo.size,
          color: variantInfo.color,
          sku: variantInfo.variantSku
        } : null
      }
    });
  }

  // Create processed item for sale record with all details
  const processedItem = {
    inventoryId: saleItem.inventoryId,
    productName: saleItem.productName,
    sku: saleItem.sku,
    quantity: saleItem.quantity,
    unitPrice: saleItem.unitPrice,
    total: saleItem.total,
    variant: variantInfo,
    batchesSoldFrom: batchesSoldFrom,
    costBreakdown: {
      totalCost: totalCost,
      weightedAverageCost: totalCost / saleItem.quantity,
      profit: totalProfit
    },
    categoryDetails: categoryDetails
  };

  return {
    processedItem,
    itemSale,
    batchesUsed,
    totalCost,
    totalProfit
  };
}

// GET - Fetch sales for user
export async function GET(req) {
  try {
    await connectToDatabase();
    
    const user = await verifySession(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const paymentMethod = searchParams.get('paymentMethod');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const inventoryId = searchParams.get('inventoryId'); // String parameter
    const batchId = searchParams.get('batchId'); // String parameter

    // Build query based on parameters
    let query = { userId: user._id };
    
    // Add payment method filter
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }
    
    // Add date range filter
    if (startDate || endDate) {
      query.saleDate = {};
      if (startDate) query.saleDate.$gte = new Date(startDate);
      if (endDate) query.saleDate.$lte = new Date(endDate);
    }
    
    // Add inventory item filter - convert string to ObjectId for proper comparison
    if (inventoryId) {
      try {
        // Convert string to ObjectId for database query
        const inventoryObjectId = new mongoose.Types.ObjectId(inventoryId);
        query['items.inventoryId'] = inventoryObjectId;
      } catch (error) {
        console.error('Invalid inventoryId format:', inventoryId);
        return NextResponse.json(
          { success: false, message: 'Invalid inventory ID format' },
          { status: 400 }
        );
      }
    }
    
    // Add batch filter - convert string to ObjectId for proper comparison
    if (batchId) {
      try {
        // Convert string to ObjectId for database query
        const batchObjectId = new mongoose.Types.ObjectId(batchId);
        query['items.batchesSoldFrom.batchId'] = batchObjectId;
      } catch (error) {
        console.error('Invalid batchId format:', batchId);
        return NextResponse.json(
          { success: false, message: 'Invalid batch ID format' },
          { status: 400 }
        );
      }
    }

    const skip = (page - 1) * limit;
    
    // Fetch sales with the query
    const sales = await Sale.find(query)
      .sort({ saleDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Use lean() for better performance since we're not modifying
    
    // Post-process results to filter items and ensure proper data structure
    let processedSales = sales;
    
    if (inventoryId || batchId) {
      processedSales = sales.map(sale => {
        // Filter items based on inventoryId (compare ObjectIds properly)
        let filteredItems = sale.items;
        
        if (inventoryId) {
          filteredItems = filteredItems.filter(item => {
            // Convert both to strings for comparison since lean() returns ObjectIds as objects
            return item.inventoryId && item.inventoryId.toString() === inventoryId;
          });
        }
        
        if (batchId) {
          // Further filter items that have the specific batch
          filteredItems = filteredItems.filter(item => 
            item.batchesSoldFrom && 
            item.batchesSoldFrom.some(batch => 
              batch.batchId && batch.batchId.toString() === batchId
            )
          );
          
          // For batch filtering, also filter the batchesSoldFrom array within each item
          filteredItems = filteredItems.map(item => ({
            ...item,
            batchesSoldFrom: item.batchesSoldFrom ? 
              item.batchesSoldFrom.filter(batch => 
                batch.batchId && batch.batchId.toString() === batchId
              ) : []
          }));
        }
        
        return {
          ...sale,
          items: filteredItems,
          // Keep original totals since this is for analysis purposes
          // The frontend will calculate filtered totals if needed
        };
      }).filter(sale => sale.items.length > 0); // Only include sales that have matching items
    }
    
    // Count total matching documents
    const total = await Sale.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: {
        sales: processedSales,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });

  } catch (error) {
    console.error('Sales fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
