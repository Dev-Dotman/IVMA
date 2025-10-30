"use client";
import { useState, useEffect } from "react";
import { 
  X, 
  CheckCircle, 
  Clock, 
  Package, 
  Truck, 
  AlertCircle,
  ArrowRight,
  Info,
  MapPin,
  Calendar,
  Phone,
  MessageSquare
} from "lucide-react";
import CustomDropdown from "../ui/CustomDropdown";

export default function OrderStatusUpdateModal({ 
  isOpen, 
  onClose, 
  order, 
  onStatusUpdate, 
  isUpdating = false 
}) {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [updateNote, setUpdateNote] = useState('');
  const [trackingInfo, setTrackingInfo] = useState({
    carrier: '',
    trackingNumber: '',
    estimatedDelivery: ''
  });
  const [showTrackingForm, setShowTrackingForm] = useState(false);
  const [errors, setErrors] = useState({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && order) {
      setSelectedStatus('');
      setUpdateNote('');
      setTrackingInfo({ carrier: '', trackingNumber: '', estimatedDelivery: '' });
      setShowTrackingForm(false);
      setErrors({});
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  // Define status flow and information
  const statusFlow = {
    pending: {
      title: 'Pending',
      description: 'Order received and awaiting confirmation',
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      nextOptions: ['confirmed', 'cancelled'],
      explanation: 'The customer has placed an order and it\'s waiting for you to review and confirm it.'
    },
    confirmed: {
      title: 'Confirmed', 
      description: 'Order confirmed and ready for processing',
      icon: CheckCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      nextOptions: ['processing', 'cancelled'],
      explanation: 'You\'ve confirmed the order. Now you can start preparing the items for shipment.'
    },
    processing: {
      title: 'Processing',
      description: 'Order is being prepared for shipment',
      icon: Package,
      color: 'text-purple-600', 
      bgColor: 'bg-purple-100',
      nextOptions: ['shipped', 'cancelled'],
      explanation: 'You\'re currently packing and preparing the order for delivery.'
    },
    shipped: {
      title: 'Shipped',
      description: 'Order has been shipped to customer',
      icon: Truck,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      nextOptions: ['delivered'],
      explanation: 'The order has been handed over to the delivery service and is on its way to the customer.',
      requiresTracking: true
    },
    delivered: {
      title: 'Delivered',
      description: 'Order successfully delivered to customer',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      nextOptions: [],
      explanation: 'The order has been successfully delivered to the customer.'
    },
    cancelled: {
      title: 'Cancelled',
      description: 'Order has been cancelled',
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      nextOptions: [],
      explanation: 'The order has been cancelled and will not be processed further.'
    }
  };

  const currentStatus = statusFlow[order.status];
  const availableStatuses = currentStatus.nextOptions.map(status => ({
    value: status,
    label: statusFlow[status].title
  }));

  // Common carrier options
  const carrierOptions = [
    { value: '', label: 'Select carrier' },
    { value: 'GIG Logistics', label: 'GIG Logistics' },
    { value: 'DHL', label: 'DHL' },
    { value: 'FedEx', label: 'FedEx' },
    { value: 'UPS', label: 'UPS' },
    { value: 'Jumia Express', label: 'Jumia Express' },
    { value: 'Konga Express', label: 'Konga Express' },
    { value: 'RedStar Express', label: 'RedStar Express' },
    { value: 'Courier Plus', label: 'Courier Plus' },
    { value: 'Other', label: 'Other' }
  ];

  // Handle status selection
  const handleStatusChange = (status) => {
    setSelectedStatus(status);
    setShowTrackingForm(status === 'shipped');
    setErrors({});
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!selectedStatus) {
      newErrors.status = 'Please select a new status';
    }

    if (selectedStatus === 'shipped') {
      if (!trackingInfo.carrier) {
        newErrors.carrier = 'Please select a carrier';
      }
      if (!trackingInfo.trackingNumber.trim()) {
        newErrors.trackingNumber = 'Please enter a tracking number';
      }
    }

    if (!updateNote.trim()) {
      newErrors.note = 'Please provide a reason for this status update';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!selectedStatus) return;
    
    try {
      const updateData = {
        status: selectedStatus,
        note: updateNote.trim(),
        updatedBy: 'admin'
      };

      // Add tracking info if shipping
      if (selectedStatus === 'shipped') {
        updateData.trackingInfo = {
          carrier: trackingInfo.carrier,
          trackingNumber: trackingInfo.trackingNumber.trim(),
          estimatedDelivery: trackingInfo.estimatedDelivery || null
        };
      }

      const response = await onStatusUpdate(order._id, updateData);
      
      // Show success message with sale information if applicable
      if (response && response.salesCreated) {
        alert(`Order updated successfully! ${response.salesCreated.count} sale(s) created automatically for ₦${response.salesCreated.totalAmount.toLocaleString()}`);
      } else if (response && response.saleCreationError) {
        alert(`Order updated successfully, but there was an issue creating sales: ${response.saleCreationError}`);
      }
      
      onClose();
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to update status' });
    }
  };

  // Get selected status info
  const selectedStatusInfo = selectedStatus ? statusFlow[selectedStatus] : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Update Order Status</h2>
              <p className="text-sm text-gray-500">Order #{order.orderNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Current Status */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Current Status</h3>
            <div className={`flex items-center p-4 rounded-xl ${currentStatus.bgColor}`}>
              <currentStatus.icon className={`w-6 h-6 ${currentStatus.color} mr-3`} />
              <div>
                <p className={`font-medium ${currentStatus.color}`}>{currentStatus.title}</p>
                <p className="text-sm text-gray-600">{currentStatus.description}</p>
              </div>
            </div>
          </div>

          {/* Order Information */}
          <div className="mb-6 p-4 bg-gray-50 rounded-xl">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Order Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Customer:</span>
                <p className="font-medium text-gray-800">{order.customerSnapshot.firstName} {order.customerSnapshot.lastName}</p>
              </div>
              <div>
                <span className="text-gray-500">Items:</span>
                <p className="font-medium text-gray-800">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
              </div>
              <div>
                <span className="text-gray-500">Total:</span>
                <p className="font-medium text-gray-800">₦{order.totalAmount.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-500">Date:</span>
                <p className="font-medium text-gray-800">{new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {availableStatuses.length === 0 ? (
            /* No More Updates Available */
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Order Complete</h3>
              <p className="text-gray-600">This order has reached its final status and cannot be updated further.</p>
            </div>
          ) : (
            <>
              {/* Available Status Updates */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Select New Status</h3>
                <p className="text-xs text-gray-500 mb-4">Choose the next status for this order based on your current progress</p>
                
                <div className="space-y-3">
                  {availableStatuses.map((status) => {
                    const statusInfo = statusFlow[status.value];
                    const isSelected = selectedStatus === status.value;
                    
                    return (
                      <button
                        key={status.value}
                        onClick={() => handleStatusChange(status.value)}
                        className={`w-full p-4 border-2 rounded-xl text-left transition-all ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <statusInfo.icon className={`w-5 h-5 ${statusInfo.color} mr-3`} />
                            <div>
                              <p className="font-medium text-gray-900">{statusInfo.title}</p>
                              <p className="text-sm text-gray-600">{statusInfo.description}</p>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </button>
                    );
                  })}
                </div>
                
                {errors.status && (
                  <p className="text-red-500 text-xs mt-2">{errors.status}</p>
                )}
              </div>

              {/* Status Explanation */}
              {selectedStatusInfo && (
                <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900 mb-1">
                        What happens when you mark this as "{selectedStatusInfo.title}"?
                      </h4>
                      <p className="text-sm text-blue-800">{selectedStatusInfo.explanation}</p>
                      
                      {selectedStatus === 'shipped' && (
                        <div className="mt-2 text-xs text-blue-700">
                          <p>• The customer will receive an email notification with tracking information</p>
                          <p>• You'll need to provide tracking details below</p>
                        </div>
                      )}
                      
                      {selectedStatus === 'cancelled' && (
                        <div className="mt-2 text-xs text-red-700">
                          <p>• This action cannot be undone</p>
                          <p>• The customer will be notified of the cancellation</p>
                          <p>• Consider refunding any payments if applicable</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tracking Information Form */}
              {showTrackingForm && (
                <div className="mb-6 p-4 border border-gray-200 rounded-xl">
                  <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
                    <Truck className="w-4 h-4 mr-2" />
                    Shipping & Tracking Information
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Delivery Company/Carrier *
                      </label>
                      <CustomDropdown
                        options={carrierOptions}
                        value={trackingInfo.carrier}
                        onChange={(value) => setTrackingInfo(prev => ({ ...prev, carrier: value }))}
                        placeholder="Select delivery company"
                        error={!!errors.carrier}
                      />
                      {errors.carrier && (
                        <p className="text-red-500 text-xs mt-1">{errors.carrier}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Tracking Number *
                      </label>
                      <input
                        type="text"
                        value={trackingInfo.trackingNumber}
                        onChange={(e) => setTrackingInfo(prev => ({ ...prev, trackingNumber: e.target.value }))}
                        placeholder="Enter tracking number"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-black text-sm ${
                          errors.trackingNumber ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.trackingNumber && (
                        <p className="text-red-500 text-xs mt-1">{errors.trackingNumber}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Estimated Delivery Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={trackingInfo.estimatedDelivery}
                        onChange={(e) => setTrackingInfo(prev => ({ ...prev, estimatedDelivery: e.target.value }))}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Update Note */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Update Note *
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Explain why you're making this status change (this will be visible in the order timeline)
                </p>
                <textarea
                  value={updateNote}
                  onChange={(e) => setUpdateNote(e.target.value)}
                  placeholder={`Example: "Order confirmed and items are in stock" or "Package handed to ${trackingInfo.carrier || 'delivery company'}"`}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-black text-sm ${
                    errors.note ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.note && (
                  <p className="text-red-500 text-xs mt-1">{errors.note}</p>
                )}
              </div>

              {/* Customer Contact Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <Phone className="w-4 h-4 mr-2" />
                  Customer Contact
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <p className="font-medium text-gray-800">{order.customerSnapshot.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <p className="font-medium text-gray-800">{order.customerSnapshot.email}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-gray-500">Delivery Address:</span>
                  <p className="font-medium text-sm text-gray-800">
                    {order.shippingAddress.street && `${order.shippingAddress.street}, `}
                    {order.shippingAddress.city}, {order.shippingAddress.state}, {order.shippingAddress.country}
                  </p>
                </div>
              </div>

              {/* Error Display */}
              {errors.submit && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{errors.submit}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {availableStatuses.length > 0 && (
          <div className="p-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <button
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={handleStatusUpdate}
                disabled={!selectedStatus || isUpdating}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {isUpdating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Updating Status...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Update to {selectedStatusInfo?.title || 'New Status'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
