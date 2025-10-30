"use client";
import { useState, useEffect } from "react";
import { X, Package, DollarSign, Calendar, Truck, Plus } from "lucide-react";
import CustomDropdown from "../ui/CustomDropdown";

export default function AddBatchModal({ isOpen, onClose, onSubmit, item }) {
  const [formData, setFormData] = useState({
    quantityIn: '',
    costPrice: '',
    sellingPrice: '',
    supplier: '',
    dateReceived: '',
    expiryDate: '',
    batchLocation: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState('existing_batch');

  // Location options (you can expand this or make it dynamic)
  const locationOptions = [
    { value: '', label: 'Select location' },
    { value: 'Main Store', label: 'Main Store' },
    { value: 'Warehouse', label: 'Warehouse' },
    { value: 'Storage Room', label: 'Storage Room' },
    { value: 'Front Display', label: 'Front Display' },
    { value: 'Back Room', label: 'Back Room' },
    { value: 'Freezer', label: 'Freezer' },
    { value: 'Other', label: 'Other' }
  ];

  // Reset form when modal opens/closes or item changes
  useEffect(() => {
    if (isOpen && item) {
      // Pre-populate with item's current data
      setFormData({
        quantityIn: '',
        costPrice: item.costPrice?.toString() || '',
        sellingPrice: item.sellingPrice?.toString() || '',
        supplier: item.supplier || '',
        dateReceived: new Date().toISOString().split('T')[0], // Today's date
        expiryDate: '',
        batchLocation: item.location || 'Main Store',
        notes: ''
      });
      setErrors({});
    }
  }, [isOpen, item]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleLocationChange = (value) => {
    setFormData(prev => ({
      ...prev,
      batchLocation: value
    }));
    if (errors.batchLocation) {
      setErrors(prev => ({ ...prev, batchLocation: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.quantityIn || parseFloat(formData.quantityIn) <= 0) {
      newErrors.quantityIn = 'Please enter a valid quantity';
    }

    if (!formData.costPrice || parseFloat(formData.costPrice) < 0) {
      newErrors.costPrice = 'Please enter a valid cost price';
    }

    if (!formData.sellingPrice || parseFloat(formData.sellingPrice) < 0) {
      newErrors.sellingPrice = 'Please enter a valid selling price';
    }

    if (parseFloat(formData.sellingPrice) < parseFloat(formData.costPrice)) {
      newErrors.sellingPrice = 'Selling price should be higher than cost price';
    }

    if (!formData.dateReceived) {
      newErrors.dateReceived = 'Please select the date received';
    }

    // Check if expiry date is before received date
    if (formData.expiryDate && formData.dateReceived) {
      if (new Date(formData.expiryDate) <= new Date(formData.dateReceived)) {
        newErrors.expiryDate = 'Expiry date must be after received date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const batchData = {
        quantityIn: parseFloat(formData.quantityIn),
        costPrice: parseFloat(formData.costPrice),
        sellingPrice: parseFloat(formData.sellingPrice),
        supplier: formData.supplier.trim(),
        dateReceived: formData.dateReceived,
        expiryDate: formData.expiryDate || null,
        batchLocation: formData.batchLocation || 'Main Store',
        notes: formData.notes.trim()
      };
      
      await onSubmit(item._id, batchData);
      
      // Reset form and close modal
      setFormData({
        quantityIn: '',
        costPrice: '',
        sellingPrice: '',
        supplier: '',
        dateReceived: '',
        expiryDate: '',
        batchLocation: '',
        notes: ''
      });
      setErrors({});
      onClose();
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to add batch' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateProfitMargin = () => {
    const cost = parseFloat(formData.costPrice) || 0;
    const selling = parseFloat(formData.sellingPrice) || 0;
    if (cost === 0) return 0;
    return (((selling - cost) / cost) * 100).toFixed(1);
  };

  const calculateTotalValue = () => {
    const quantity = parseFloat(formData.quantityIn) || 0;
    const cost = parseFloat(formData.costPrice) || 0;
    return quantity * cost;
  };

  const calculatePotentialRevenue = () => {
    const quantity = parseFloat(formData.quantityIn) || 0;
    const selling = parseFloat(formData.sellingPrice) || 0;
    return quantity * selling;
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Add New Batch</h2>
              <p className="text-sm text-gray-500">{item.productName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {errors.submit && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{errors.submit}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Quantity Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Package className="w-5 h-5 mr-2 text-gray-600" />
                Stock Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity Received *
                  </label>
                  <input
                    type="number"
                    name="quantityIn"
                    value={formData.quantityIn}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="Enter quantity"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black ${
                      errors.quantityIn ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.quantityIn && (
                    <p className="text-red-500 text-xs mt-1">{errors.quantityIn}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Unit: {item.unitOfMeasure}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Storage Location
                  </label>
                  <CustomDropdown
                    options={locationOptions}
                    value={formData.batchLocation}
                    onChange={handleLocationChange}
                    placeholder="Select storage location"
                    error={!!errors.batchLocation}
                  />
                  {errors.batchLocation && (
                    <p className="text-red-500 text-xs mt-1">{errors.batchLocation}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-gray-600" />
                Pricing Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cost Price per Unit *
                  </label>
                  <input
                    type="number"
                    name="costPrice"
                    value={formData.costPrice}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black ${
                      errors.costPrice ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.costPrice && (
                    <p className="text-red-500 text-xs mt-1">{errors.costPrice}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selling Price per Unit *
                  </label>
                  <input
                    type="number"
                    name="sellingPrice"
                    value={formData.sellingPrice}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black ${
                      errors.sellingPrice ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.sellingPrice && (
                    <p className="text-red-500 text-xs mt-1">{errors.sellingPrice}</p>
                  )}
                </div>

                {/* Profit Margin Display */}
                {formData.costPrice && formData.sellingPrice && (
                  <div className="md:col-span-2">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-lg font-bold text-gray-900">
                            {calculateProfitMargin()}%
                          </div>
                          <div className="text-xs text-gray-500">Profit Margin</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-red-600">
                            ₦{calculateTotalValue().toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">Total Investment</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-green-600">
                            ₦{calculatePotentialRevenue().toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">Potential Revenue</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dates Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-gray-600" />
                Date Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Received *
                  </label>
                  <input
                    type="date"
                    name="dateReceived"
                    value={formData.dateReceived}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black ${
                      errors.dateReceived ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.dateReceived && (
                    <p className="text-red-500 text-xs mt-1">{errors.dateReceived}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black ${
                      errors.expiryDate ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.expiryDate && (
                    <p className="text-red-500 text-xs mt-1">{errors.expiryDate}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty if product doesn't expire
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Truck className="w-5 h-5 mr-2 text-gray-600" />
                Additional Information
              </h3>
              
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supplier
                  </label>
                  <input
                    type="text"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleChange}
                    placeholder="Supplier name (optional)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Any additional notes about this batch..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                </div>
              </div>
            </div>

            {/* New Batch Info */}
            {selectedBatch === 'new_batch' && (
              <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start space-x-2">
                  <Plus className="w-4 h-4 text-green-600 mt-0.5" />
                  <div className="text-xs text-green-700">
                    <p className="font-medium">Creating New Batch</p>
                    <p>A new batch will be created with current product pricing</p>
                    <p className="mt-1 text-gray-600">
                      Batch code format: {item.sku ? item.sku.split('-')[0] : 'PRD'}-{new Date().toISOString().slice(2, 10).replace(/-/g, '')}-B###
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adding Batch...
                </>
              ) : (
                'Add Batch'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
