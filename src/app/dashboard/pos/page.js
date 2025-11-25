"use client";
import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ReceiptModal from "@/components/dashboard/ReceiptModal";
import CreateStoreModal from "@/components/dashboard/CreateStoreModal";
import DeliveryScheduleModal from "@/components/dashboard/DeliveryScheduleModal";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import useOrderProcessingStore from "@/store/orderProcessingStore";
import { usePOSData } from "@/hooks/usePOSData";
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Calculator, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  User, 
  Receipt, 
  ShoppingCart,
  Package,
  Scan,
  Store,
  CheckCircle, 
  AlertCircle, 
  ArrowLeft, 
  FileText
} from "lucide-react";

export default function POSPage() {
  const { secureApiCall } = useAuth();
  const router = useRouter();
  
  // Order processing store
  const {
    processingOrder,
    orderCart,
    orderCustomer,
    isProcessingOrder,
    clearProcessingOrder,
    updateOrderCart,
    updateOrderCustomer,
    completeOrderProcessing
  } = useOrderProcessingStore();

  // Use TanStack Query for data fetching
  const {
    hasStore,
    store,
    inventoryItems,
    isLoading,
    processSale: processSaleMutation,
    scheduleDelivery: scheduleDeliveryMutation,
    updateOrderStatus: updateOrderStatusMutation,
    isProcessingSale: isSaleProcessing,
    refetchInventory,
    refetchStore,
  } = usePOSData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [completedSale, setCompletedSale] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isCreateStoreModalOpen, setIsCreateStoreModalOpen] = useState(false);
  const [isDeliveryPromptOpen, setIsDeliveryPromptOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [pendingSaleForDelivery, setPendingSaleForDelivery] = useState(null);

  // Show create store modal if no store
  useEffect(() => {
    if (hasStore === false) {
      setIsCreateStoreModalOpen(true);
    }
  }, [hasStore]);

  // Handle store creation
  const handleStoreCreated = (newStore) => {
    setIsCreateStoreModalOpen(false);
    refetchStore();
    refetchInventory();
  };

  // Filter items using useMemo instead of useEffect to prevent infinite loop
  const filteredItems = useMemo(() => {
    let filtered = inventoryItems;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brand?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    return filtered;
  }, [searchTerm, selectedCategory, inventoryItems]);

  // Get unique categories using useMemo
  const categories = useMemo(() => {
    return [...new Set(inventoryItems.map(item => item.category))];
  }, [inventoryItems]);

  // Add item to cart
  const addToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem._id === item._id);
    
    if (existingItem) {
      if (existingItem.quantity < item.quantityInStock) {
        setCart(cart.map(cartItem =>
          cartItem._id === item._id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        ));
      }
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  // Update cart item quantity
  const updateCartQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    const item = inventoryItems.find(item => item._id === itemId);
    if (newQuantity > item.quantityInStock) return;

    setCart(cart.map(cartItem =>
      cartItem._id === itemId
        ? { ...cartItem, quantity: newQuantity }
        : cartItem
    ));
  };

  // Remove item from cart
  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item._id !== itemId));
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    setCustomer({ name: '', phone: '' });
    setDiscount(0);
    setTax(0);
    setAmountReceived('');
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
  const discountAmount = (subtotal * discount) / 100;
  const taxAmount = ((subtotal - discountAmount) * tax) / 100;
  const total = subtotal - discountAmount + taxAmount;
  const balance = parseFloat(amountReceived || 0) - total;

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Handle delivery scheduling
  const handleScheduleDelivery = async (deliveryData) => {
    try {
      await scheduleDeliveryMutation({
        saleId: pendingSaleForDelivery._id,
        transactionId: pendingSaleForDelivery.transactionId,
        orderId: pendingSaleForDelivery.linkedOrderId || null,
        deliveryType: pendingSaleForDelivery.isFromOrder ? 'order' : 'pos_sale',
        ...deliveryData
      });

      alert('Delivery scheduled successfully!');
      setIsDeliveryModalOpen(false);
      setPendingSaleForDelivery(null);
      setIsReceiptModalOpen(true);
    } catch (error) {
      console.error('Error scheduling delivery:', error);
      alert('Error scheduling delivery: ' + error.message);
    }
  };

  // Skip delivery scheduling
  const handleSkipDelivery = () => {
    setIsDeliveryPromptOpen(false);
    setPendingSaleForDelivery(null);
    setIsReceiptModalOpen(true);
  };

  // Process sale
  const processSale = async () => {
    if (!isProcessingOrder) {
      // Regular POS sale
      if (cart.length === 0) {
        alert('Please add items to cart before completing sale');
        return;
      }
      
      if (paymentMethod === 'cash' && parseFloat(amountReceived || 0) < total) {
        alert('Amount received is less than total amount');
        return;
      }

      try {
        const calculatedSubtotal = cart.reduce((sum, item) => sum + (Number(item.sellingPrice) * Number(item.quantity)), 0);
        const calculatedDiscountAmount = (calculatedSubtotal * Number(discount)) / 100;
        const calculatedTaxAmount = ((calculatedSubtotal - calculatedDiscountAmount) * Number(tax)) / 100;
        const calculatedTotal = calculatedSubtotal - calculatedDiscountAmount + calculatedTaxAmount;
        const calculatedBalance = paymentMethod === 'cash' ? (Number(amountReceived) - calculatedTotal) : 0;

        const saleData = {
          items: cart.map(item => ({
            inventoryId: item._id,
            productName: item.productName,
            sku: item.sku,
            quantity: Number(item.quantity),
            unitPrice: Number(item.sellingPrice),
            total: Number(item.sellingPrice) * Number(item.quantity)
          })),
          customer: customer || { name: '', phone: '', email: '' },
          subtotal: calculatedSubtotal,
          discount: calculatedDiscountAmount,
          tax: calculatedTaxAmount,
          total: calculatedTotal,
          paymentMethod: paymentMethod,
          amountReceived: Number(amountReceived) || calculatedTotal,
          balance: calculatedBalance,
          saleDate: new Date().toISOString(),
          soldBy: null,
          isFromOrder: false,
          isOrderProcessing: false
        };

        const response = await processSaleMutation(saleData);

        if (response.success) {
          const completedSaleData = {
            ...saleData,
            _id: response.data._id,
            transactionId: response.data.transactionId,
            saleDate: response.data.saleDate || new Date().toISOString(),
            status: response.data.status || 'completed'
          };
          
          setCompletedSale(completedSaleData);
          setPendingSaleForDelivery(completedSaleData);
          clearCart();
          setIsDeliveryPromptOpen(true);
        }
      } catch (error) {
        console.error('Error processing sale:', error);
        alert('Error processing sale: ' + error.message);
      }
    } else {
      // Processing an order - call the order completion handler
      return completeOrderSale();
    }
  };

  // Handle order processing completion
  const completeOrderSale = async () => {
    // Processing an order
    if (cart.length === 0) {
      alert('Please add items to cart before completing order');
      return;
    }
    
    if (paymentMethod === 'cash' && parseFloat(amountReceived || 0) < total) {
      alert('Amount received is less than total amount');
      return;
    }

    try {
      // Ensure all values are properly calculated and formatted
      const calculatedSubtotal = cart.reduce((sum, item) => sum + (Number(item.sellingPrice) * Number(item.quantity)), 0);
      const calculatedDiscountAmount = (calculatedSubtotal * Number(discount)) / 100;
      const calculatedTaxAmount = ((calculatedSubtotal - calculatedDiscountAmount) * Number(tax)) / 100;
      const calculatedTotal = calculatedSubtotal - calculatedDiscountAmount + calculatedTaxAmount;
      const calculatedBalance = paymentMethod === 'cash' ? (Number(amountReceived) - calculatedTotal) : 0;

      // First, create the sale with all required fields
      const saleData = {
        items: cart.map(item => ({
          inventoryId: item._id,
          productName: item.productName,
          sku: item.sku,
          quantity: Number(item.quantity),
          unitPrice: Number(item.sellingPrice),
          total: Number(item.sellingPrice) * Number(item.quantity)
        })),
        customer: customer || { name: '', phone: '', email: '' },
        subtotal: calculatedSubtotal,
        discount: calculatedDiscountAmount,
        tax: calculatedTaxAmount,
        total: calculatedTotal,
        paymentMethod: paymentMethod,
        amountReceived: Number(amountReceived) || calculatedTotal,
        balance: calculatedBalance,
        saleDate: new Date().toISOString(),
        soldBy: null,
        linkedOrderId: processingOrder._id,
        isOrderProcessing: true,
        isFromOrder: true,
        orderNumber: processingOrder.orderNumber
      };

      const saleResponse = await processSaleMutation(saleData);

      if (saleResponse.success) {
        const statusUpdateData = {
          status: 'processed',
          note: `Order processed through POS. Sale transaction: ${saleResponse.data.transactionId}`,
          updatedBy: 'admin'
        };

        await updateOrderStatusMutation({
          orderId: processingOrder._id,
          statusData: statusUpdateData
        });

        const completedOrder = completeOrderProcessing();
        
        const completedSaleData = {
          ...saleData,
          _id: saleResponse.data._id,
          transactionId: saleResponse.data.transactionId,
          saleDate: saleResponse.data.saleDate || new Date().toISOString(),
          status: saleResponse.data.status || 'completed',
          processedOrder: completedOrder
        };
        
        setCompletedSale(completedSaleData);
        setPendingSaleForDelivery(completedSaleData);
        clearCart();
        setIsDeliveryPromptOpen(true);
      }
    } catch (error) {
      console.error('Error processing order:', error);
      alert('Error processing order: ' + error.message);
    }
  };

  // Handle canceling order processing
  const cancelOrderProcessing = () => {
    clearProcessingOrder();
    clearCart();
    router.push('/dashboard/orders');
  };

  // Initialize POS with order data if processing an order
  useEffect(() => {
    if (isProcessingOrder && orderCart.length > 0) {
      setCart(orderCart);
      if (orderCustomer) {
        setCustomer(orderCustomer);
      }
    }
  }, [isProcessingOrder, orderCart, orderCustomer]);

  if (isLoading || hasStore === null) {
    return (
      <DashboardLayout title="Store Mode (POS)" subtitle="Point of Sale System">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Selection Skeleton - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search and Filters Skeleton */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex-1 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
                <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
              </div>

              {/* Category Filter Skeleton */}
              <div className="flex items-center space-x-2 overflow-x-auto">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 w-20 bg-gray-200 rounded-lg animate-pulse"></div>
                ))}
              </div>
            </div>

            {/* Product Grid Skeleton */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="h-6 w-32 bg-gray-200 rounded mb-4 animate-pulse"></div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-4 animate-pulse">
                    <div className="aspect-square bg-gray-200 rounded-lg mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3 mb-3"></div>
                    <div className="flex items-center justify-between">
                      <div className="h-5 bg-gray-200 rounded w-16"></div>
                      <div className="h-3 bg-gray-200 rounded w-12"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cart and Checkout Skeleton - Right Side */}
          <div className="space-y-6">
            {/* Cart Skeleton */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
              </div>

              <div className="space-y-3 max-h-64">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg animate-pulse">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gray-200 rounded"></div>
                      <div className="w-8 h-4 bg-gray-200 rounded"></div>
                      <div className="w-8 h-8 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center py-8 hidden">
                <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-4 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-24 mx-auto"></div>
              </div>
            </div>

            {/* Customer Info Skeleton */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="h-6 w-40 bg-gray-200 rounded mb-4 animate-pulse"></div>
              <div className="space-y-3">
                <div className="h-11 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="h-11 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
            </div>

            {/* Payment and Totals Skeleton */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="h-6 w-44 bg-gray-200 rounded mb-4 animate-pulse"></div>

              {/* Discount and Tax Skeleton */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-20 bg-gray-200 rounded"></div>
                  <div className="flex-1 h-11 bg-gray-200 rounded-lg animate-pulse"></div>
                  <div className="h-4 w-4 bg-gray-200 rounded"></div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-20 bg-gray-200 rounded"></div>
                  <div className="flex-1 h-11 bg-gray-200 rounded-lg animate-pulse"></div>
                  <div className="h-4 w-4 bg-gray-200 rounded"></div>
                </div>
              </div>

              {/* Payment Method Skeleton */}
              <div className="mb-4">
                <div className="h-4 w-32 bg-gray-200 rounded mb-2 animate-pulse"></div>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              </div>

              {/* Totals Skeleton */}
              <div className="border-t border-gray-200 pt-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ))}
                <div className="flex justify-between border-t border-gray-200 pt-2">
                  <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-6 w-28 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>

              {/* Process Sale Button Skeleton */}
              <div className="w-full mt-4 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Store Mode (POS)" subtitle={store ? `${store.storeName} - Point of Sale` : "Point of Sale System"}>
      {/* Order Processing Header */}
      {isProcessingOrder && processingOrder && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 rounded-xl">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-blue-900">Processing Order #{processingOrder.orderNumber}</h2>
                <p className="text-sm text-blue-700">
                  Customer: {orderCustomer?.name} • Items: {orderCart.length} • 
                  Total: {formatCurrency(processingOrder.totalAmount)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/dashboard/orders')}
                className="flex items-center space-x-2 px-3 py-2 text-blue-600 hover:text-blue-800 text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Orders</span>
              </button>
              <button
                onClick={cancelOrderProcessing}
                className="flex items-center space-x-2 px-4 py-2 border border-red-300 text-red-600 rounded-xl hover:bg-red-50 transition-colors text-sm"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Cancel Processing</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store Info Header */}
      {store && (
        <div className="mb-6 bg-white rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-teal-100 rounded-xl">
              <Store className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{store.storeName}</h2>
              <p className="text-sm text-gray-500">
                {store.fullAddress || 'No address set'} 
                {store.storePhone && ` • ${store.storePhone}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Existing POS content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Selection - Left Side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search and Filters */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search products by name, SKU, or scan barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
                />
              </div>
              <button className="p-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors">
                <Scan className="w-5 h-5" />
              </button>
            </div>

            {/* Category Filter */}
            <div className="flex items-center space-x-2 overflow-x-auto">
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                  selectedCategory === '' 
                    ? 'bg-teal-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                    selectedCategory === category 
                      ? 'bg-teal-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Products</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map(item => (
                <div
                  key={item._id}
                  className="border border-gray-200 rounded-xl p-4 hover:border-teal-500 hover:shadow-md transition-all cursor-pointer relative"
                  onClick={() => addToCart(item)}
                >
                  {/* Batch indicator */}
                  {item.hasBatchPricing && (
                    <div className="absolute top-2 right-2 bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                      Batch
                    </div>
                  )}
                  
                  <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.productName}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Package className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <h4 className="font-medium text-gray-900 text-sm mb-1 truncate">{item.productName}</h4>
                  <p className="text-xs text-gray-500 mb-2">{item.sku}</p>
                  
                  {/* Show batch code if available */}
                  {item.batchPricing?.activeBatchCode && (
                    <p className="text-xs text-green-600 mb-2">
                      {item.batchPricing.activeBatchCode}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-teal-600">
                        {formatCurrency(item.sellingPrice)}
                      </span>
                      {/* Show if price is from batch vs original */}
                      {item.hasBatchPricing && item.sellingPrice !== item.originalSellingPrice && (
                        <span className="text-xs text-gray-400 line-through">
                          {formatCurrency(item.originalSellingPrice)}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      Stock: {item.quantityInStock}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {filteredItems.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No products found</p>
              </div>
            )}
          </div>
        </div>

        {/* Cart and Checkout - Right Side */}
        <div className="space-y-6">
          {/* Cart */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2" />
                {isProcessingOrder ? 'Order Items' : 'Cart'} ({cart.length})
              </h3>
              {cart.length > 0 && !isProcessingOrder && (
                <button
                  onClick={clearCart}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {cart.map(item => (
                <div key={item._id} className={`flex items-center justify-between p-3 rounded-lg ${
                  item.isOrderItem ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                }`}>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900 text-sm">{item.productName}</h4>
                      {item.isOrderItem && (
                        <CheckCircle className="w-4 h-4 text-blue-600" title="From order" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{formatCurrency(item.sellingPrice)} each</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateCartQuantity(item._id, item.quantity - 1)}
                      className="p-1 text-gray-500 hover:text-red-600"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center text-gray-900 font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(item._id, item.quantity + 1)}
                      className="p-1 text-gray-500 hover:text-teal-600"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item._id)}
                      className="p-1 text-gray-500 hover:text-red-600 ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {cart.length === 0 && (
              <div className="text-center py-8">
                <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">
                  {isProcessingOrder ? 'No order items' : 'Cart is empty'}
                </p>
              </div>
            )}
          </div>

          {/* Customer Info */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Customer Info {isProcessingOrder && '(From Order)'}
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Customer name"
                value={customer.name}
                onChange={(e) => {
                  const newCustomer = { ...customer, name: e.target.value };
                  setCustomer(newCustomer);
                  if (isProcessingOrder) {
                    updateOrderCustomer(newCustomer);
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black ${
                  isProcessingOrder ? 'bg-blue-50 border-blue-200' : 'border-gray-300'
                }`}
              />
              <input
                type="tel"
                placeholder="Phone number"
                value={customer.phone}
                onChange={(e) => {
                  const newCustomer = { ...customer, phone: e.target.value };
                  setCustomer(newCustomer);
                  if (isProcessingOrder) {
                    updateOrderCustomer(newCustomer);
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black ${
                  isProcessingOrder ? 'bg-blue-50 border-blue-200' : 'border-gray-300'
                }`}
              />
            </div>
          </div>

          {/* Payment and Totals */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Calculator className="w-5 h-5 mr-2" />
              Payment & Totals
            </h3>

            {/* Discount and Tax */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600 w-20">Discount:</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-black"
                  placeholder="0"
                />
                <span className="text-sm text-gray-600">%</span>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600 w-20">Tax:</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={tax}
                  onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-black"
                  placeholder="0"
                />
                <span className="text-sm text-gray-600">%</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 rounded-lg border text-sm font-medium ${
                    paymentMethod === 'cash'
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Banknote className="w-4 h-4 mx-auto mb-1" />
                  Cash
                </button>
                <button
                  onClick={() => setPaymentMethod('transfer')}
                  className={`p-3 rounded-lg border text-sm font-medium ${
                    paymentMethod === 'transfer'
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Smartphone className="w-4 h-4 mx-auto mb-1" />
                  Transfer
                </button>
                <button
                  onClick={() => setPaymentMethod('pos')}
                  className={`p-3 rounded-lg border text-sm font-medium ${
                    paymentMethod === 'pos'
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4 mx-auto mb-1" />
                  POS
                </button>
              </div>
            </div>

            {/* Amount Received */}
            {paymentMethod === 'cash' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount Received</label>
                <input
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-black"
                  placeholder="0.00"
                />
              </div>
            )}

            {/* Totals */}
            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount ({discount}%):</span>
                  <span className="font-medium text-red-600">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax ({tax}%):</span>
                  <span className="font-medium">{formatCurrency(taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg text-gray-900 font-bold border-t border-gray-200 pt-2">
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
              {paymentMethod === 'cash' && amountReceived && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Change:</span>
                  <span className={`font-medium ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(balance)}
                  </span>
                </div>
              )}
            </div>

            {/* Process Sale Button */}
            <button
              onClick={processSale}
              disabled={cart.length === 0 || isSaleProcessing || (paymentMethod === 'cash' && parseFloat(amountReceived || 0) < total)}
              className="w-full mt-4 bg-teal-600 text-white py-3 rounded-xl font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isSaleProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isProcessingOrder ? 'Processing Order...' : 'Processing Sale...'}
                </>
              ) : (
                <>
                  <Receipt className="w-5 h-5 mr-2" />
                  {isProcessingOrder ? 'Complete Order' : 'Complete Sale'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Create Store Modal */}
      <CreateStoreModal
        isOpen={isCreateStoreModalOpen}
        onStoreCreated={handleStoreCreated}
      />

      {/* Delivery Prompt Modal */}
      {isDeliveryPromptOpen && pendingSaleForDelivery && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {pendingSaleForDelivery.isFromOrder ? 'Order Processed!' : 'Sale Completed!'}
              </h3>
              
              <p className="text-gray-600 mb-2">
                Transaction: {pendingSaleForDelivery.transactionId}
              </p>
              
              {pendingSaleForDelivery.processedOrder && (
                <p className="text-blue-600 text-sm mb-4">
                  Order #{pendingSaleForDelivery.processedOrder.orderNumber} processed successfully
                </p>
              )}
              
              <p className="text-gray-700 mb-6">
                Would you like to schedule a delivery for this {pendingSaleForDelivery.isFromOrder ? 'order' : 'sale'}?
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleSkipDelivery}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  No, Skip
                </button>
                <button
                  onClick={() => {
                    setIsDeliveryPromptOpen(false);
                    setIsDeliveryModalOpen(true);
                  }}
                  className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors"
                >
                  Yes, Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Schedule Modal */}
      <DeliveryScheduleModal
        isOpen={isDeliveryModalOpen}
        onClose={() => {
          setIsDeliveryModalOpen(false);
          setPendingSaleForDelivery(null);
          setIsReceiptModalOpen(true);
        }}
        onSubmit={handleScheduleDelivery}
        sale={pendingSaleForDelivery}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setCompletedSale(null);
        }}
        sale={completedSale}
      />
    </DashboardLayout>
  );
}
