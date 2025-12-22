"use client";
import { useState, useEffect } from "react";
import { 
  X, 
  Package, 
  User, 
  MapPin, 
  CreditCard, 
  Truck, 
  Calendar,
  Phone,
  Store,
  Mail,
  Edit,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  ExternalLink,
  Copy,
  FileText
} from "lucide-react";
import OrderStatusUpdateModal from "./OrderStatusUpdateModal";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import useOrderProcessingStore from "@/store/orderProcessingStore";

export default function OrderDetailsModal({ 
  isOpen, 
  onClose, 
  order: initialOrder, 
  onStatusUpdate, 
  updatingStatus = false 
}) {
  const router = useRouter();
  const { secureApiCall } = useAuth();
  const { setProcessingOrder } = useOrderProcessingStore();
  const [activeTab, setActiveTab] = useState('details');
  const [copied, setCopied] = useState(false);
  const [isStatusUpdateModalOpen, setIsStatusUpdateModalOpen] = useState(false);
  const [order, setOrder] = useState(initialOrder);
  const [isConfirmingOrder, setIsConfirmingOrder] = useState(false);

  // Update local order when prop changes
  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  // Refresh order data from server
  const refreshOrderData = async () => {
    if (!order?._id) return;
    
    try {
      const response = await secureApiCall(`/api/orders/${order._id}`);
      if (response.success) {
        setOrder(response.data);
      }
    } catch (error) {
      console.error('Error refreshing order data:', error);
    }
  };

  if (!isOpen || !order) return null;

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status color and icon
  const getStatusInfo = (status) => {
    const statusMap = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      confirmed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      processing: { color: 'bg-purple-100 text-purple-800', icon: Package },
      shipped: { color: 'bg-indigo-100 text-indigo-800', icon: Truck },
      delivered: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle },
      refunded: { color: 'bg-gray-100 text-gray-800', icon: DollarSign }
    };
    
    return statusMap[status] || { color: 'bg-gray-100 text-gray-800', icon: Clock };
  };

  // Copy order number
  const copyOrderNumber = async () => {
    try {
      await navigator.clipboard.writeText(order.orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Check if order can be processed (instead of just updated)
  const canProcessOrder = () => {
    // Only allow processing for confirmed orders that haven't been completed
    const processableStatuses = ['confirmed', 'processing'];
    return processableStatuses.includes(order.status);
  };

  // Handle processing order in POS
  const handleProcessOrder = () => {
    if (!order) return;
    
    // Create order object with complete variant information
    const orderWithVariants = {
      ...order,
      items: order.items.map(item => ({
        ...item,
        // Ensure variant information is included
        variant: item.variant ? {
          size: item.variant.size,
          color: item.variant.color,
          variantSku: item.variant.variantSku,
          variantId: item.variant.variantId,
          images: item.variant.images || []
        } : null,
        productSnapshot: {
          ...item.productSnapshot,
          hasVariants: item.productSnapshot.hasVariants || false
        }
      }))
    };
    
    // Set the order in the processing store
    setProcessingOrder(orderWithVariants);
    
    // Close the modal
    onClose();
    
    // Navigate to POS page
    router.push('/dashboard/pos');
  };

  // Check if order can be confirmed and processed
  const canConfirmAndProcess = () => {
    // Only allow for pending orders
    return order.status === 'pending';
  };

  // Handle confirming order and starting processing
  const handleConfirmAndProcess = async () => {
    if (!order) return;
    
    setIsConfirmingOrder(true);
    
    try {
      // First, update the order status to confirmed
      const statusUpdateData = {
        status: 'confirmed',
        note: 'Order confirmed and ready for processing via POS system',
        updatedBy: 'admin'
      };

      await onStatusUpdate(order._id, statusUpdateData);
      
      // Create updated order object with variant information for processing store
      const confirmedOrder = {
        ...order,
        status: 'confirmed',
        // Ensure variant information is properly included in items
        items: order.items.map(item => ({
          ...item,
          // Include variant details if they exist
          variant: item.variant ? {
            size: item.variant.size,
            color: item.variant.color,
            variantSku: item.variant.variantSku,
            variantId: item.variant.variantId,
            images: item.variant.images || []
          } : null,
          // Also include product snapshot
          productSnapshot: {
            ...item.productSnapshot,
            hasVariants: item.productSnapshot.hasVariants || false
          }
        }))
      };
      
      // Set the confirmed order in the processing store
      setProcessingOrder(confirmedOrder);
      
      // Close the modal
      onClose();
      
      // Navigate to POS page
      router.push('/dashboard/pos');
      
    } catch (error) {
      console.error('Error confirming order:', error);
      alert('Failed to confirm order: ' + error.message);
    } finally {
      setIsConfirmingOrder(false);
    }
  };

  // Check if status can be updated
  const canUpdateStatus = () => {
    const finalStatuses = ['delivered', 'cancelled', 'refunded'];
    return !finalStatuses.includes(order.status);
  };

  // Handle opening status update modal
  const handleOpenStatusUpdate = () => {
    setIsStatusUpdateModalOpen(true);
    // Close the order details modal automatically
    onClose();
  };

  // Handle status update completion
  const handleStatusUpdateComplete = async (orderId, updateData) => {
    try {
      // Call the parent's status update function
      await onStatusUpdate(orderId, updateData);
      
      // Refresh the order data to get updated timeline
      await refreshOrderData();
      
      // Close the status update modal
      setIsStatusUpdateModalOpen(false);
    } catch (error) {
      console.error('Error updating status:', error);
      throw error;
    }
  };

  const statusInfo = getStatusInfo(order.status);
  const StatusIcon = statusInfo.icon;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-semibold text-gray-900">#{order.orderNumber}</h2>
                  <button
                    onClick={copyOrderNumber}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Copy order number"
                  >
                    {copied ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="flex items-center space-x-3 mt-1">
                  <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                  <span className="text-sm text-gray-500">{formatDate(order.createdAt)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {canConfirmAndProcess() && (
                <button
                  onClick={handleConfirmAndProcess}
                  disabled={isConfirmingOrder}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isConfirmingOrder ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Confirm & Start Processing</span>
                    </>
                  )}
                </button>
              )}

              {(order.status === 'confirmed' || order.status === 'processing') && (
                <button
                  onClick={handleProcessOrder}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <Package className="w-4 h-4" />
                  <span>Continue Processing</span>
                </button>
              )}
              
              {canUpdateStatus() && !canConfirmAndProcess() && (
                <button
                  onClick={handleOpenStatusUpdate}
                  className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  <span>Update Status</span>
                </button>
              )}
              
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            {[
              { id: 'details', label: 'Order Details', icon: FileText },
              { id: 'customer', label: 'Customer Info', icon: User },
              { id: 'timeline', label: 'Timeline', icon: Calendar }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'details' && (
              <div className="space-y-8">
                {/* Order Items */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
                  <div className="space-y-4">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex items-start justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-start space-x-4 flex-1">
                          {/* Product Image */}
                          <div className="flex-shrink-0">
                            {item.productSnapshot.image || (item.variant && item.variant.image) ? (
                              <img
                                src={item.variant && item.variant.image ? item.variant.image : item.productSnapshot.image}
                                alt={item.productSnapshot.productName}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                                <Package className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 mb-1">
                              {item.productSnapshot.productName}
                            </h4>
                            
                            {/* Variant Information */}
                            {item.variant && item.variant.size && item.variant.color && (
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800">
                                  {item.variant.color} - {item.variant.size}
                                </span>
                                {item.variant.sku && (
                                  <span className="text-xs text-gray-500">
                                    Variant SKU: {item.variant.sku}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {/* Product Details */}
                            <div className="space-y-0.5">
                              <p className="text-xs text-gray-500">
                                SKU: {item.productSnapshot.sku} • Qty: {item.quantity}
                              </p>
                              {item.productSnapshot.category && (
                                <p className="text-xs text-gray-500">
                                  Category: {item.productSnapshot.category}
                                </p>
                              )}
                              {item.productSnapshot.brand && (
                                <p className="text-xs text-gray-500">
                                  Brand: {item.productSnapshot.brand}
                                </p>
                              )}
                            </div>

                            {/* Batch Information */}
                            {item.batchCode && (
                              <div className="mt-2 text-xs text-blue-600">
                                From Batch: {item.batchCode}
                              </div>
                            )}

                            {/* Store Information */}
                            {item.storeSnapshot && (
                              <div className="mt-2 p-2 bg-white rounded-lg border border-gray-200">
                                <div className="flex items-center space-x-1.5 text-xs">
                                  <Store className="w-3 h-3 text-gray-400" />
                                  <span className="font-medium text-gray-700">
                                    {item.storeSnapshot.storeName}
                                  </span>
                                </div>
                                {item.storeSnapshot.storePhone && (
                                  <div className="flex items-center space-x-1.5 text-xs text-gray-600 mt-1">
                                    <Phone className="w-3 h-3 text-gray-400" />
                                    <span>{item.storeSnapshot.storePhone}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Item Status (if different from order status) */}
                            {item.itemStatus && item.itemStatus !== order.status && (
                              <div className="mt-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  getStatusInfo(item.itemStatus).color
                                }`}>
                                  Item Status: {item.itemStatus.charAt(0).toUpperCase() + item.itemStatus.slice(1)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Price Info */}
                        <div className="text-right ml-4 flex-shrink-0">
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            {formatCurrency(item.subtotal)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(item.price)} each
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="text-gray-900">{formatCurrency(order.subtotal)}</span>
                      </div>
                      {order.tax > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tax:</span>
                          <span className="text-gray-900">{formatCurrency(order.tax)}</span>
                        </div>
                      )}
                      {order.shippingFee > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Shipping:</span>
                          <span className="text-gray-900">{formatCurrency(order.shippingFee)}</span>
                        </div>
                      )}
                      {order.discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Discount:</span>
                          <span className="text-red-600">-{formatCurrency(order.discount)}</span>
                        </div>
                      )}
                      {order.couponDiscount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Coupon ({order.couponCode}):</span>
                          <span className="text-red-600">-{formatCurrency(order.couponDiscount)}</span>
                        </div>
                      )}
                      <div className="border-t border-gray-200 pt-2">
                        <div className="flex justify-between text-base font-semibold">
                          <span className="text-gray-900">Total:</span>
                          <span className="text-gray-900">{formatCurrency(order.totalAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                        <p className="text-sm font-medium text-gray-900 capitalize">
                          {order.paymentInfo.method.replace('_', ' ')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Payment Status</p>
                        <span className={`text-sm font-medium ${
                          order.paymentInfo.status === 'completed' ? 'text-green-600' :
                          order.paymentInfo.status === 'pending' ? 'text-yellow-600' :
                          order.paymentInfo.status === 'failed' ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {order.paymentInfo.status.charAt(0).toUpperCase() + order.paymentInfo.status.slice(1)}
                        </span>
                      </div>
                      {order.paymentInfo.transactionId && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Transaction ID</p>
                          <p className="text-sm font-mono text-gray-900">{order.paymentInfo.transactionId}</p>
                        </div>
                      )}
                      {order.paymentInfo.paidAt && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Payment Date</p>
                          <p className="text-sm text-gray-900">{formatDate(order.paymentInfo.paidAt)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Shipping Information */}
                {order.tracking && (order.tracking.trackingNumber || order.tracking.carrier) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipping Information</h3>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {order.tracking.carrier && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Carrier</p>
                            <p className="text-sm font-medium text-gray-900">{order.tracking.carrier}</p>
                          </div>
                        )}
                        {order.tracking.trackingNumber && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Tracking Number</p>
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-mono text-gray-900">{order.tracking.trackingNumber}</p>
                              {order.tracking.trackingUrl && (
                                <a
                                  href={order.tracking.trackingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                        {order.tracking.shippedAt && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Shipped Date</p>
                            <p className="text-sm text-gray-900">{formatDate(order.tracking.shippedAt)}</p>
                          </div>
                        )}
                        {order.tracking.estimatedDelivery && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Estimated Delivery</p>
                            <p className="text-sm text-gray-900">{formatDate(order.tracking.estimatedDelivery)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'customer' && (
              <div className="space-y-8">
                {/* Customer Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2 text-teal-600" />
                    Customer Information
                  </h3>
                  <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Full Name</p>
                        <p className="text-base font-semibold text-gray-900">
                          {order.customerSnapshot.firstName} {order.customerSnapshot.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Email Address</p>
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <a 
                            href={`mailto:${order.customerSnapshot.email}`}
                            className="text-base text-teal-600 hover:text-teal-700 hover:underline"
                          >
                            {order.customerSnapshot.email}
                          </a>
                        </div>
                      </div>
                      {order.customerSnapshot.phone && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Phone Number</p>
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <a 
                              href={`tel:${order.customerSnapshot.phone}`}
                              className="text-base text-teal-600 hover:text-teal-700 hover:underline"
                            >
                              {order.customerSnapshot.phone}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Truck className="w-5 h-5 mr-2 text-teal-600" />
                    Delivery Address
                  </h3>
                  <div className="bg-gradient-to-br from-teal-50 to-white rounded-xl p-6 border border-teal-200">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-teal-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        {/* Contact Info */}
                        <div className="mb-4 pb-4 border-b border-teal-100">
                          <p className="text-base font-semibold text-gray-900">
                            {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                          </p>
                          <div className="flex items-center space-x-4 mt-2">
                            <div className="flex items-center space-x-1.5 text-sm text-gray-600">
                              <Phone className="w-3.5 h-3.5" />
                              <span>{order.shippingAddress.phone}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Address Details */}
                        <div className="space-y-2">
                          {order.shippingAddress.street && (
                            <div className="flex items-start space-x-2">
                              <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-teal-600 rounded-full"></div>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Street Address</p>
                                <p className="text-sm text-gray-900 mt-0.5">{order.shippingAddress.street}</p>
                              </div>
                            </div>
                          )}
                          
                          {order.shippingAddress.landmark && (
                            <div className="flex items-start space-x-2">
                              <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-teal-600 rounded-full"></div>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Landmark</p>
                                <p className="text-sm text-gray-900 mt-0.5">{order.shippingAddress.landmark}</p>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-start space-x-2">
                            <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-teal-600 rounded-full"></div>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">City & State</p>
                              <p className="text-sm text-gray-900 mt-0.5">
                                {order.shippingAddress.city}, {order.shippingAddress.state}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-start space-x-2">
                            <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-teal-600 rounded-full"></div>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Country</p>
                              <p className="text-sm text-gray-900 mt-0.5">
                                {order.shippingAddress.country}
                                {order.shippingAddress.postalCode && ` - ${order.shippingAddress.postalCode}`}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Full Address Display */}
                        <div className="mt-4 pt-4 border-t border-teal-100">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Complete Address</p>
                          <div className="bg-white rounded-lg p-3 border border-teal-100">
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {[
                                order.shippingAddress.street,
                                order.shippingAddress.landmark,
                                order.shippingAddress.city,
                                order.shippingAddress.state,
                                order.shippingAddress.postalCode,
                                order.shippingAddress.country
                              ].filter(Boolean).join(', ')}
                            </p>
                          </div>
                        </div>

                        {/* Copy Address Button */}
                        <button
                          onClick={async () => {
                            const fullAddress = [
                              order.shippingAddress.street,
                              order.shippingAddress.landmark,
                              order.shippingAddress.city,
                              order.shippingAddress.state,
                              order.shippingAddress.postalCode,
                              order.shippingAddress.country
                            ].filter(Boolean).join(', ');
                            
                            try {
                              await navigator.clipboard.writeText(fullAddress);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            } catch (error) {
                              console.error('Failed to copy address:', error);
                            }
                          }}
                          className="mt-4 flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
                        >
                          {copied ? (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              <span>Address Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span>Copy Address</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Billing Address */}
                {order.billingAddress && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <CreditCard className="w-5 h-5 mr-2 text-teal-600" />
                      Billing Address
                      {order.shippingAddress.street === order.billingAddress.street && (
                        <span className="ml-3 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                          Same as Shipping
                        </span>
                      )}
                    </h3>
                    <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-6 border border-blue-200">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <CreditCard className="w-6 h-6 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          {/* Contact Info */}
                          <div className="mb-4 pb-4 border-b border-blue-100">
                            <p className="text-base font-semibold text-gray-900">
                              {order.billingAddress.firstName} {order.billingAddress.lastName}
                            </p>
                            <div className="flex items-center space-x-4 mt-2">
                              <div className="flex items-center space-x-1.5 text-sm text-gray-600">
                                <Phone className="w-3.5 h-3.5" />
                                <span>{order.billingAddress.phone}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Address Details */}
                          <div className="space-y-2">
                            {order.billingAddress.street && (
                              <div className="flex items-start space-x-2">
                                <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Street Address</p>
                                  <p className="text-sm text-gray-900 mt-0.5">{order.billingAddress.street}</p>
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-start space-x-2">
                              <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">City & State</p>
                                <p className="text-sm text-gray-900 mt-0.5">
                                  {order.billingAddress.city}, {order.billingAddress.state}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-start space-x-2">
                              <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Country</p>
                                <p className="text-sm text-gray-900 mt-0.5">
                                  {order.billingAddress.country}
                                  {order.billingAddress.postalCode && ` - ${order.billingAddress.postalCode}`}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Full Address Display */}
                          <div className="mt-4 pt-4 border-t border-blue-100">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Complete Address</p>
                            <div className="bg-white rounded-lg p-3 border border-blue-100">
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {[
                                  order.billingAddress.street,
                                  order.billingAddress.city,
                                  order.billingAddress.state,
                                  order.billingAddress.postalCode,
                                  order.billingAddress.country
                                ].filter(Boolean).join(', ')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Order Notes */}
                {order.customerNotes && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-teal-600" />
                      Customer Notes
                    </h3>
                    <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-yellow-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-yellow-900 uppercase tracking-wide mb-2">Special Instructions</p>
                          <p className="text-sm text-yellow-900 leading-relaxed">{order.customerNotes}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin Notes (if any) */}
                {order.adminNotes && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
                      Internal Notes
                    </h3>
                    <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-orange-900 uppercase tracking-wide mb-2">Admin Notes</p>
                          <p className="text-sm text-orange-900 leading-relaxed">{order.adminNotes}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'timeline' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Timeline</h3>
                <div className="space-y-4">
                  {order.timeline && order.timeline.length > 0 ? (
                    order.timeline.map((event, index) => (
                      <div key={index} className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-teal-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 capitalize">
                              {event.status.replace('_', ' ')}
                            </p>
                            <p className="text-xs text-gray-500">{formatDate(event.timestamp)}</p>
                          </div>
                          {event.note && (
                            <p className="text-sm text-gray-600 mt-1">{event.note}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Updated by: {event.updatedBy}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">No timeline events available</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Status Update Modal */}
      <OrderStatusUpdateModal
        isOpen={isStatusUpdateModalOpen}
        onClose={() => setIsStatusUpdateModalOpen(false)}
        order={order}
        onStatusUpdate={handleStatusUpdateComplete}
        isUpdating={updatingStatus}
      />
    </>
  );
}
