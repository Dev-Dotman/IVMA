"use client";
import { Package, AlertCircle, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import CustomDropdown from "@/components/ui/CustomDropdown";
import { useState, useEffect } from "react";

export default function VariantManager({
  detectedColors,
  variants,
  setVariants,
  getAvailableSizes,
  calculateTotalStock,
  syncSizesToCategory,
  syncStockToForm
}) {
  const [sizeMode, setSizeMode] = useState('same'); // 'same', 'one-size', 'different'
  const [defaultStock, setDefaultStock] = useState('5');
  const [expandedVariants, setExpandedVariants] = useState({});
  const [sharedSizes, setSharedSizes] = useState([]);

  // Initialize variants when colors are detected - moved to useEffect
  useEffect(() => {
    if (detectedColors.length >= 2 && variants.length === 0) {
      const initialVariants = detectedColors.map(color => ({
        color: color,
        sizes: []
      }));
      setVariants(initialVariants);
    }
  }, [detectedColors, variants.length, setVariants]);

  // Add useEffect to sync stock whenever variants change
  useEffect(() => {
    if (variants && variants.length > 0) {
      // Use a small delay to ensure all state updates complete
      const timeoutId = setTimeout(() => {
        syncStockToForm();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [variants]);

  const toggleVariantExpanded = (colorIndex) => {
    setExpandedVariants(prev => ({
      ...prev,
      [colorIndex]: !prev[colorIndex]
    }));
  };

  const handleSizeModeChange = (mode) => {
    setSizeMode(mode);
    
    if (mode === 'one-size') {
      // Set all variants to "One Size" with default stock
      const updatedVariants = variants.map(variant => ({
        ...variant,
        sizes: [{
          size: 'One Size',
          quantityInStock: parseInt(defaultStock) || 0,
          reorderLevel: 5
        }]
      }));
      setVariants(updatedVariants);
      setSharedSizes(['One Size']);
      
      // Sync "One Size" to category
      syncSizesToCategory(['One Size']);
    } else if (mode === 'same') {
      // Reset shared sizes selection
      setSharedSizes([]);
      // Clear all variant sizes until user selects shared sizes
      const updatedVariants = variants.map(variant => ({
        ...variant,
        sizes: []
      }));
      setVariants(updatedVariants);
      
      // Clear category sizes when switching to same mode
      syncSizesToCategory([]);
    } else if (mode === 'different') {
      // Clear shared sizes
      setSharedSizes([]);
      // Keep existing variant sizes or clear them
      const updatedVariants = variants.map(variant => ({
        ...variant,
        sizes: []
      }));
      setVariants(updatedVariants);
      
      // Clear category sizes when switching to different mode
      syncSizesToCategory([]);
    }
  };

  const updateVariantSizeStock = (colorIndex, sizeIndex, quantity) => {
    const updatedVariants = [...variants];
    updatedVariants[colorIndex].sizes[sizeIndex].quantityInStock = parseInt(quantity) || 0;
    setVariants(updatedVariants);
  };

  const toggleSizeForVariant = (colorIndex, size) => {
    const updatedVariants = [...variants];
    const variant = updatedVariants[colorIndex];
    
    const existingSizeIndex = variant.sizes.findIndex(s => s.size === size);
    
    if (existingSizeIndex >= 0) {
      // Remove size
      variant.sizes.splice(existingSizeIndex, 1);
    } else {
      // Add size
      variant.sizes.push({
        size: size,
        quantityInStock: parseInt(defaultStock) || 0,
        reorderLevel: 5
      });
    }
    
    setVariants(updatedVariants);
    
    // For "different" mode, collect all unique sizes across all variants
    if (sizeMode === 'different') {
      const allUniqueSizes = [...new Set(updatedVariants.flatMap(v => v.sizes.map(s => s.size)))];
      syncSizesToCategory(allUniqueSizes);
    }
  };

  const removeSizeFromVariant = (colorIndex, sizeIndex) => {
    const updatedVariants = [...variants];
    updatedVariants[colorIndex].sizes.splice(sizeIndex, 1);
    setVariants(updatedVariants);
    
    // For "different" mode, collect all unique sizes across all variants
    if (sizeMode === 'different') {
      const allUniqueSizes = [...new Set(updatedVariants.flatMap(v => v.sizes.map(s => s.size)))];
      syncSizesToCategory(allUniqueSizes);
    }
  };

  const handleDefaultStockChange = (value) => {
    setDefaultStock(value);
    
    if (sizeMode === 'one-size') {
      // Update all variants
      const updatedVariants = variants.map(variant => ({
        ...variant,
        sizes: [{
          size: 'One Size',
          quantityInStock: parseInt(value) || 0,
          reorderLevel: 5
        }]
      }));
      setVariants(updatedVariants);
    } else if (sizeMode === 'same') {
      // Update all sizes across all variants with new default
      const updatedVariants = variants.map(variant => ({
        ...variant,
        sizes: variant.sizes.map(s => ({
          ...s,
          quantityInStock: parseInt(value) || 0
        }))
      }));
      setVariants(updatedVariants);
    }
  };

  const handleSharedSizeToggle = (size) => {
    const newSharedSizes = sharedSizes.includes(size)
      ? sharedSizes.filter(s => s !== size)
      : [...sharedSizes, size];
    
    setSharedSizes(newSharedSizes);

    // Apply to all variants if in "same" mode
    if (sizeMode === 'same') {
      const updatedVariants = variants.map(variant => {
        // Keep existing quantities for sizes that remain selected
        const existingSizeObjects = variant.sizes.filter(s => newSharedSizes.includes(s.size));
        
        // Add new sizes with default stock
        const newSizeObjects = newSharedSizes
          .filter(size => !existingSizeObjects.find(s => s.size === size))
          .map(size => ({
            size: size,
            quantityInStock: parseInt(defaultStock) || 0,
            reorderLevel: 5
          }));
        
        return {
          ...variant,
          sizes: [...existingSizeObjects, ...newSizeObjects]
        };
      });
      setVariants(updatedVariants);
      
      // Sync unique sizes across all variants to category
      syncSizesToCategory(newSharedSizes);
    }
  };

  if (detectedColors.length < 2) return null;

  const availableSizes = getAvailableSizes();
  
  // Define all possible sizes based on detected category
  const getAllPossibleSizes = () => {
    // Since we don't have category prop, check if we have clothing/shoes sizes
    // Default to clothing sizes (most common for variants)
    return ['One Size', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Plus Size', 'Kids 2-4', 'Kids 5-7', 'Kids 8-12', 'Custom'];
  };

  // Always use all possible sizes - don't limit by category details
  const allSizeOptions = getAllPossibleSizes();

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
        <Package className="w-5 h-5 mr-2 text-gray-600" />
        Product Variants Detected
      </h3>

      {/* Variant Detection Alert */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 mb-1">
              We detected {detectedColors.length} color variants
            </p>
            <p className="text-xs text-blue-700">
              You've tagged images with different colors: {detectedColors.join(', ')}. 
              Let's set up sizes and stock for each color variant.
            </p>
          </div>
        </div>
      </div>

      {/* Size Configuration Mode */}
      <div className="mb-6 p-4 bg-gray-50 rounded-xl">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          How do you want to configure sizes?
        </label>
        
        <div className="space-y-2">
          <label className="flex items-start space-x-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-50 transition-colors border-2 border-transparent has-[:checked]:border-teal-500">
            <input
              type="radio"
              name="sizeMode"
              value="one-size"
              checked={sizeMode === 'one-size'}
              onChange={(e) => handleSizeModeChange(e.target.value)}
              className="mt-0.5 w-4 h-4 text-teal-600 focus:ring-teal-500"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">One Size Fits All</div>
              <div className="text-xs text-gray-500">All color variants come in one universal size</div>
            </div>
          </label>

          <label className="flex items-start space-x-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-50 transition-colors border-2 border-transparent has-[:checked]:border-teal-500">
            <input
              type="radio"
              name="sizeMode"
              value="same"
              checked={sizeMode === 'same'}
              onChange={(e) => handleSizeModeChange(e.target.value)}
              className="mt-0.5 w-4 h-4 text-teal-600 focus:ring-teal-500"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">Same Sizes for All Variants</div>
              <div className="text-xs text-gray-500">All colors have the same available sizes (you can select multiple)</div>
            </div>
          </label>

          <label className="flex items-start space-x-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-50 transition-colors border-2 border-transparent has-[:checked]:border-teal-500">
            <input
              type="radio"
              name="sizeMode"
              value="different"
              checked={sizeMode === 'different'}
              onChange={(e) => handleSizeModeChange(e.target.value)}
              className="mt-0.5 w-4 h-4 text-teal-600 focus:ring-teal-500"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">Different Sizes per Variant</div>
              <div className="text-xs text-gray-500">Each color can have different available sizes (select multiple per color)</div>
            </div>
          </label>
        </div>
      </div>

      {/* Default Stock Amount */}
      <div className="mb-6 p-4 bg-gray-50 rounded-xl">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Default Stock Amount for All Sizes
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Set a default quantity that will apply to all sizes. You can adjust individual sizes later.
        </p>
        <input
          type="number"
          value={defaultStock}
          onChange={(e) => handleDefaultStockChange(e.target.value)}
          min="0"
          placeholder="5"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
        />
      </div>

      {/* Shared Sizes Selection (for "same" mode) */}
      {sizeMode === 'same' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Sizes (will apply to all color variants) *
          </label>
          <p className="text-xs text-gray-500 mb-3">Click to select/deselect multiple sizes</p>
          <div className="flex flex-wrap gap-2">
            {allSizeOptions.map(size => (
              <button
                key={size}
                type="button"
                onClick={() => handleSharedSizeToggle(size)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sharedSizes.includes(size)
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
          {sharedSizes.length === 0 && (
            <p className="text-xs text-amber-600 mt-2">
              ⚠️ Please select at least one size
            </p>
          )}
        </div>
      )}

      {/* Variant List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-700">Variant Stock Details</h4>
          <div className="text-sm text-gray-600">
            Total Stock: <span className="font-semibold text-gray-900">{calculateTotalStock()}</span>
          </div>
        </div>

        {variants.map((variant, colorIndex) => (
          <div key={colorIndex} className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Variant Header */}
            <button
              type="button"
              onClick={() => toggleVariantExpanded(colorIndex)}
              className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div 
                  className="w-6 h-6 rounded-full border-2 border-gray-300"
                  style={{ backgroundColor: variant.color.toLowerCase() }}
                  title={variant.color}
                />
                <span className="font-medium text-gray-900">{variant.color}</span>
                <span className="text-sm text-gray-500">
                  {variant.sizes.length} {variant.sizes.length === 1 ? 'size' : 'sizes'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  Stock: {variant.sizes.reduce((sum, s) => sum + s.quantityInStock, 0)}
                </span>
                {expandedVariants[colorIndex] ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </button>

            {/* Variant Details (Expanded) */}
            {expandedVariants[colorIndex] && (
              <div className="p-4 bg-white">
                {/* Add Size (for "different" mode) */}
                {sizeMode === 'different' && (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Select Sizes for {variant.color}
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Click to add/remove sizes</p>
                    <div className="flex flex-wrap gap-2">
                      {allSizeOptions.map(size => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => toggleSizeForVariant(colorIndex, size)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            variant.sizes.find(s => s.size === size)
                              ? 'bg-teal-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Size Stock List */}
                {variant.sizes.length === 0 ? (
                  <div className="text-center py-4 text-sm text-gray-500">
                    {sizeMode === 'different' 
                      ? 'No sizes selected yet. Click a size above to add it.'
                      : sizeMode === 'same'
                      ? 'Select sizes above to add them to all variants.'
                      : 'Size configuration pending.'
                    }
                  </div>
                ) : (
                  <div className="space-y-2">
                    {variant.sizes.map((sizeObj, sizeIndex) => (
                      <div key={sizeIndex} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{sizeObj.size}</div>
                        </div>
                        <div className="w-32">
                          <input
                            type="number"
                            value={sizeObj.quantityInStock}
                            onChange={(e) => updateVariantSizeStock(colorIndex, sizeIndex, e.target.value)}
                            min="0"
                            placeholder="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm text-black"
                          />
                        </div>
                        {sizeMode === 'different' && (
                          <button
                            type="button"
                            onClick={() => removeSizeFromVariant(colorIndex, sizeIndex)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove this size"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
