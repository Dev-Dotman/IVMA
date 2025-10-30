"use client";
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import OrderDetailsModal from "@/components/dashboard/OrderDetailsModal";
import OrderStatusUpdateModal from "@/components/dashboard/OrderStatusUpdateModal";
import CustomDropdown from "@/components/ui/CustomDropdown";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign,
  Phone,
  MapPin,
  Calendar,
  MoreHorizontal,
  X,
  ExternalLink,
  Download
} from "lucide-react";

export default function OrdersPage() {
  const { secureApiCall } = useAuth();
  const [orders, setOrders] = useState([]);
  const [orderStats, setOrderStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [filterValue, setFilterValue] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);
  const [isStatusUpdateModalOpen, setIsStatusUpdateModalOpen] = useState(false);
  const [selectedOrderForUpdate, setSelectedOrderForUpdate] = useState(null);
  const [updatingOrders, setUpdatingOrders] = useState(new Set());

  // Filter options
  const filterOptions = [
    { value: 'all', label: 'All Orders' },
    { value: 'status', label: 'Filter by Status' },
    { value: 'paymentStatus', label: 'Filter by Payment' },
    { value: 'dateRange', label: 'Filter by Date' },
    { value: 'store', label: 'Filter by Store' }
  ];

  // Status filter options
  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'refunded', label: 'Refunded' }
  ];

  // Payment status options
  const paymentStatusOptions = [
    { value: '', label: 'All Payments' },
    { value: 'pending', label: 'Pending Payment' },
    { value: 'completed', label: 'Paid' },
    { value: 'failed', label: 'Failed' },
    { value: 'refunded', label: 'Refunded' }
  ];

  // Fetch orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filterBy === 'status' && filterValue) {
        params.append('status', filterValue);
      }
      if (filterBy === 'paymentStatus' && filterValue) {
        params.append('paymentStatus', filterValue);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const url = `/api/orders${params.toString() ? '?' + params.toString() : ''}`;
      const response = await secureApiCall(url);
      
      if (response.success) {
        setOrders(response.data.orders || []);
        setOrderStats(response.data.stats || null);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filterBy, filterValue, searchTerm]);

  // Handle status update with new modal
  const handleStatusUpdateClick = (order) => {
    setSelectedOrderForUpdate(order);
    setIsStatusUpdateModalOpen(true);
  };

  // Update order status with the new format and refresh order details
  const updateOrderStatus = async (orderId, updateData) => {
    setUpdatingOrders(prev => new Set([...prev, orderId]));
    
    try {
      const response = await secureApiCall(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      if (response.success) {
        // Update local orders list
        setOrders(prev => 
          prev.map(order => 
            order._id === orderId 
              ? { 
                  ...order, 
                  status: updateData.status, 
                  tracking: updateData.trackingInfo || order.tracking,
                  // Add the new timeline event
                  timeline: [
                    ...(order.timeline || []),
                    {
                      status: updateData.status,
                      timestamp: new Date(),
                      note: updateData.note || '',
                      updatedBy: updateData.updatedBy || 'admin'
                    }
                  ]
                }
              : order
          )
        );
        
        // Update selected order if it's the one being updated
        if (selectedOrder && selectedOrder._id === orderId) {
          // Fetch fresh order data to get the complete updated timeline
          try {
            const orderResponse = await secureApiCall(`/api/orders/${orderId}`);
            if (orderResponse.success) {
              setSelectedOrder(orderResponse.data);
            }
          } catch (error) {
            console.error('Error fetching updated order:', error);
          }
        }
      } else {
        throw new Error(response.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    } finally {
      setUpdatingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  // Filter orders based on search and filters
  const getFilteredOrders = () => {
    let filtered = orders;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerSnapshot.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${order.customerSnapshot.firstName} ${order.customerSnapshot.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.items.some(item => 
          item.productSnapshot.productName.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    return filtered;
  };

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

  // Get payment status color
  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'failed':
        return 'text-red-600';
      case 'refunded':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  // Handle filter changes
  const handleFilterByChange = (value) => {
    setFilterBy(value);
    setFilterValue('');
  };

  // Clear filters
  const clearFilters = () => {
    setFilterBy('all');
    setFilterValue('');
    setSearchTerm('');
  };

  // View order details
  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setIsOrderDetailsModalOpen(true);
  };

  const filteredOrders = getFilteredOrders();

  // Stats cards
  const statsCards = orderStats ? [
    {
      title: 'Total Orders',
      value: orderStats.totalOrders.toString(),
      icon: ShoppingBag,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      description: 'All time orders'
    },
    {
      title: 'Pending Orders',
      value: orderStats.pendingOrders.toString(),
      icon: Clock,
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      description: 'Awaiting processing'
    },
    {
      title: 'Completed Orders',
      value: orderStats.completedOrders.toString(),
      icon: CheckCircle,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      description: 'Successfully delivered'
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(orderStats.totalRevenue || 0),
      icon: DollarSign,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      description: 'From all orders'
    }
  ] : [];

  if (loading) {
    return (
      <DashboardLayout title="Order Management" subtitle="Manage customer orders and fulfillment">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading orders...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Order Management" subtitle="Manage customer orders and fulfillment">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {statsCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div key={index} className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-3">
                    <div className={`p-2 ${stat.iconBg} rounded-xl mr-3`}>
                      <IconComponent className={`w-5 h-5 ${stat.iconColor}`} />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900">{stat.title}</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{stat.description}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Orders Overview */}
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Customer Orders</h2>
            <div className="flex items-center space-x-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-80 bg-gray-50 border-0 rounded-xl focus:outline-none text-gray-900 focus:ring-2 focus:ring-teal-500 focus:bg-white text-sm transition-all duration-200"
                />
              </div>

              {/* Filter Type Dropdown */}
              <CustomDropdown
                options={filterOptions}
                value={filterBy}
                onChange={handleFilterByChange}
                placeholder="Filter by..."
                className="w-48"
              />

              {/* Filter Value Dropdown */}
              {filterBy === 'status' && (
                <CustomDropdown
                  options={statusOptions}
                  value={filterValue}
                  onChange={setFilterValue}
                  placeholder="Select status"
                  className="w-48"
                />
              )}

              {filterBy === 'paymentStatus' && (
                <CustomDropdown
                  options={paymentStatusOptions}
                  value={filterValue}
                  onChange={setFilterValue}
                  placeholder="Select payment status"
                  className="w-48"
                />
              )}

              {/* Clear filters */}
              {(filterBy !== 'all' || searchTerm) && (
                <button 
                  onClick={clearFilters}
                  className="px-4 py-2.5 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
                >
                  Clear
                </button>
              )}

              {/* Export button */}
              <button className="flex items-center space-x-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium transition-all duration-200">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Active Filters Display */}
          {((filterBy !== 'all' && filterValue)) && (
            <div className="mt-4 flex items-center space-x-2">
              <span className="text-sm text-gray-500">Active filters:</span>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                  {filterBy === 'status' && `Status: ${statusOptions.find(opt => opt.value === filterValue)?.label}`}
                  {filterBy === 'paymentStatus' && `Payment: ${paymentStatusOptions.find(opt => opt.value === filterValue)?.label}`}
                  <button
                    onClick={() => setFilterValue('')}
                    className="ml-2 text-teal-600 hover:text-teal-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <ShoppingBag className="w-12 h-12 text-gray-300 mb-4" />
                      <p className="text-gray-500 text-lg font-medium mb-2">No orders found</p>
                      <p className="text-gray-400 text-sm">
                        {orders.length === 0 ? 'No orders have been placed yet' : 'Try adjusting your search or filter criteria'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const statusInfo = getStatusInfo(order.status);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <tr key={order._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">#{order.orderNumber}</div>
                          <div className="text-xs text-gray-500">
                            {order.isMultiVendor && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-1">
                                Multi-vendor
                              </span>
                            )}
                            {order.itemCount} item{order.itemCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {order.customerSnapshot.firstName} {order.customerSnapshot.lastName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {order.customerSnapshot.email}
                          </div>
                          {order.customerSnapshot.phone && (
                            <div className="text-xs text-gray-500 flex items-center mt-1">
                              <Phone className="w-3 h-3 mr-1" />
                              {order.customerSnapshot.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {order.items.slice(0, 2).map(item => item.productSnapshot.productName).join(', ')}
                          {order.items.length > 2 && ` +${order.items.length - 2} more`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.stores.length > 1 && `${order.stores.length} stores`}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">{formatCurrency(order.totalAmount)}</div>
                        {order.discount > 0 && (
                          <div className="text-xs text-gray-500">-{formatCurrency(order.discount)} discount</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className={`text-sm font-medium ${getPaymentStatusColor(order.paymentInfo.status)}`}>
                          {order.paymentInfo.status.charAt(0).toUpperCase() + order.paymentInfo.status.slice(1)}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {order.paymentInfo.method.replace('_', ' ')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{formatDate(order.createdAt)}</div>
                        <div className="text-xs text-gray-500 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(order.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1">
                          <button 
                            onClick={() => viewOrderDetails(order)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {/* Status Update Button */}
                          <button 
                            onClick={() => handleStatusUpdateClick(order)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Update status"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          {/* Tracking button for shipped orders */}
                          {order.status === 'shipped' && order.tracking.trackingUrl && (
                            <a 
                              href={order.tracking.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Track package"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          
                          <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Results Summary */}
        {orders.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing {filteredOrders.length} of {orders.length} orders
              {searchTerm && ` matching "${searchTerm}"`}
              {filterBy !== 'all' && filterValue && ` with applied filters`}
            </p>
          </div>
        )}
      </div>

      {/* Order Status Update Modal */}
      <OrderStatusUpdateModal
        isOpen={isStatusUpdateModalOpen}
        onClose={() => {
          setIsStatusUpdateModalOpen(false);
          setSelectedOrderForUpdate(null);
        }}
        order={selectedOrderForUpdate}
        onStatusUpdate={updateOrderStatus}
        isUpdating={selectedOrderForUpdate ? updatingOrders.has(selectedOrderForUpdate._id) : false}
      />

      {/* Order Details Modal */}
      <OrderDetailsModal
        isOpen={isOrderDetailsModalOpen}
        onClose={() => {
          setIsOrderDetailsModalOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        onStatusUpdate={updateOrderStatus}
        updatingStatus={selectedOrder ? updatingOrders.has(selectedOrder._id) : false}
      />
    </DashboardLayout>
  );
}
