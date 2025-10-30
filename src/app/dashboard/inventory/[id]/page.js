"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ChevronLeft,
  Edit,
  Delete,
  Package,
  DollarSign,
  MapPin,
  Calendar,
  BarChart3,
  AlertTriangle,
  Eye,
  QrCode,
  TrendingUp,
  Receipt
} from "lucide-react";
import EditInventoryModal from "@/components/dashboard/EditInventoryModal";
import StockUpdateModal from "@/components/dashboard/StockUpdateModal";
import InventoryActivityPanel from "@/components/dashboard/InventoryActivityPanel";
import AddBatchModal from "@/components/dashboard/AddBatchModal";
import CustomDropdown from "@/components/ui/CustomDropdown";
import InventorySalesTable from "@/components/dashboard/InventorySalesTable";

export default function InventoryDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { secureApiCall  } = useAuth();
  const [item, setItem] = useState(null);
  const [itemSalesData, setItemSalesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isActivityPanelOpen, setIsActivityPanelOpen] = useState(false);
  const [isAddBatchModalOpen, setIsAddBatchModalOpen] = useState(false);

  // Fetch inventory item details
  const fetchItemDetails = async () => {
    try {
      setLoading(true);
      const response = await secureApiCall(`/api/inventory/${id}`);
      if (response.success) {
        setItem(response.data);
      } else {
        setError(response.message || 'Item not found');
      }
    } catch (error) {
      console.error('Error fetching item details:', error);
      setError('Failed to load item details');
    }
  };

  // Fetch item sales analytics
  const fetchItemSalesData = async () => {
    try {
      const response = await secureApiCall(`/api/inventory/${id}/sales-analytics`);
      if (response.success) {
        setItemSalesData(response.data);
      } else {
        console.log('Sales analytics not available:', response.message);
        // Don't set this as an error - it's optional data
        setItemSalesData(null);
      }
    } catch (error) {
      console.error('Error fetching item sales data:', error);
      // Don't set error here as this is optional data
      setItemSalesData(null);
    }
  };

  useEffect(() => {
    if (id) {
      const loadData = async () => {
        await Promise.all([
          fetchItemDetails(), 
          fetchItemSalesData()
        ]);
        setLoading(false);
      };
      loadData();
    }
  }, [id]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (item) => {
    if (!item) return 'bg-gray-100 text-gray-800';
    if (item.quantityInStock === 0) return 'bg-red-100 text-red-800';
    if (item.quantityInStock <= item.reorderLevel) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (item) => {
    if (!item) return 'Unknown';
    if (item.quantityInStock === 0) return 'Out of Stock';
    if (item.quantityInStock <= item.reorderLevel) return 'Low Stock';
    return 'In Stock';
  };

  const calculateProfitMargin = (item) => {
    if (!item || item.costPrice === 0) return 0;
    return (((item.sellingPrice - item.costPrice) / item.costPrice) * 100).toFixed(1);
  };

  // Handle editing inventory item
  const handleEditItem = async (itemId, itemData) => {
    try {
      const response = await secureApiCall(`/api/inventory/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(itemData)
      });

      if (response.success) {
        // Refresh item details
        await fetchItemDetails();
        return response;
      } else {
        throw new Error(response.message || 'Failed to update item');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  };

  // Handle stock update
  const handleStockUpdate = async (itemId, updateData) => {
    try {
      const response = await secureApiCall(`/api/inventory/${itemId}/stock`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      if (response.success) {
        // Refresh item details
        await fetchItemDetails();
        return response;
      } else {
        throw new Error(response.message || 'Failed to update stock');
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      throw error;
    }
  };

  // Handle adding new batch
  const handleAddBatch = async (itemId, batchData) => {
    try {
      const response = await secureApiCall(`/api/inventory/${itemId}/batches`, {
        method: 'POST',
        body: JSON.stringify(batchData)
      });

      if (response.success) {
        // Refresh item details to show updated totals
        await fetchItemDetails();
        return response;
      } else {
        throw new Error(response.message || 'Failed to add batch');
      }
    } catch (error) {
      console.error('Error adding batch:', error);
      throw error;
    }
  };

  // Enhanced calculations using ItemSale data
  const getEnhancedMetrics = () => {
    if (!itemSalesData || !item) {
      return {
        totalRevenue: (item?.soldQuantity || 0) * (item?.sellingPrice || 0),
        totalProfit: (item?.soldQuantity || 0) * ((item?.sellingPrice || 0) - (item?.costPrice || 0)),
        averageSellingPrice: item?.sellingPrice || 0,
        totalSales: item?.soldQuantity || 0,
        turnoverRate: item?.totalStockedQuantity > 0 ? ((item?.soldQuantity || 0) / item.totalStockedQuantity) * 100 : 0,
        salesCount: 0,
        lastSaleDate: null
      };
    }

    return {
      totalRevenue: itemSalesData.totalRevenue || 0,
      totalProfit: itemSalesData.totalProfit || 0,
      averageSellingPrice: itemSalesData.averageUnitPrice || item.sellingPrice,
      totalSales: itemSalesData.totalQuantitySold || 0,
      turnoverRate: item.totalStockedQuantity > 0 ? (itemSalesData.totalQuantitySold / item.totalStockedQuantity) * 100 : 0,
      salesCount: itemSalesData.salesCount || 0,
      lastSaleDate: itemSalesData.lastSaleDate
    };
  };

  const enhancedMetrics = getEnhancedMetrics();

  if (loading) {
    return (
      <DashboardLayout title="Loading..." subtitle="Please wait">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading item details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !item) {
    return (
      <DashboardLayout title="Error" subtitle="Something went wrong">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Item Not Found</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/dashboard/inventory')}
              className="px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors"
            >
              Back to Inventory
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={item.productName} subtitle="Product Details">
      {/* Breadcrumb Navigation */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/inventory')}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Inventory</span>
        </button>
        <div className="mt-2 flex items-center text-sm text-gray-500">
          <span>Inventory</span>
          <ChevronLeft className="w-4 h-4 mx-1 rotate-180" />
          <span className="font-medium text-gray-900">{item.productName}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Product Overview */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start space-x-4">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.productName}
                    className="w-20 h-20 object-cover rounded-xl border border-gray-200"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center">
                    <Package className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">{item.productName}</h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>SKU: {item.sku}</span>
                    <span>•</span>
                    <span>Category: {item.category}</span>
                    {item.brand && (
                      <>
                        <span>•</span>
                        <span>Brand: {item.brand}</span>
                      </>
                    )}
                  </div>
                  <div className="mt-2">
                    <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(item)}`}>
                      {getStatusText(item)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setIsEditModalOpen(true)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                  <Delete className="w-5 h-5" />
                </button>
              </div>
            </div>

            {item.description && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="text-2xl font-bold text-gray-900">{item.quantityInStock}</div>
                <div className="text-xs text-gray-500 mt-1">Current Stock</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="text-2xl font-bold text-purple-600">{item.totalStockedQuantity || 0}</div>
                <div className="text-xs text-gray-500 mt-1">Total Stocked</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="text-2xl font-bold text-blue-600">{item.soldQuantity || 0}</div>
                <div className="text-xs text-gray-500 mt-1">Total Sold</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="text-2xl font-bold text-green-600">{calculateProfitMargin(item)}%</div>
                <div className="text-xs text-gray-500 mt-1">Profit Margin</div>
              </div>
            </div>
          </div>

          {/* Sales & Revenue Analytics */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-gray-600" />
              Sales & Revenue Analytics
              {itemSalesData && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  Live Data
                </span>
              )}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-blue-700">Total Revenue</h3>
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {formatCurrency(enhancedMetrics.totalRevenue)}
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  From {enhancedMetrics.totalSales} {item.unitOfMeasure.toLowerCase()} sold
                  {enhancedMetrics.salesCount && enhancedMetrics.salesCount !== enhancedMetrics.totalSales && (
                    <span className="block">Across {enhancedMetrics.salesCount} transactions</span>
                  )}
                </p>
              </div>

              <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-green-700">Total Profit</h3>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {formatCurrency(enhancedMetrics.totalProfit)}
                </div>
                <p className="text-xs text-green-600 mt-1">
                  Profit from all sales
                  {itemSalesData && (
                    <span className="block">
                      Avg: {formatCurrency(enhancedMetrics.totalProfit / (enhancedMetrics.totalSales || 1))} per unit
                    </span>
                  )}
                </p>
              </div>

              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-purple-700">Expected Revenue</h3>
                  <Eye className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-900">
                  {formatCurrency(item.quantityInStock * enhancedMetrics.averageSellingPrice)}
                </div>
                <p className="text-xs text-purple-600 mt-1">
                  If all current stock sold
                  {enhancedMetrics.averageSellingPrice !== item.sellingPrice && (
                    <span className="block">At avg price: {formatCurrency(enhancedMetrics.averageSellingPrice)}</span>
                  )}
                </p>
              </div>

              <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-orange-700">Turnover Rate</h3>
                  <Package className="w-4 h-4 text-orange-600" />
                </div>
                <div className="text-2xl font-bold text-orange-900">
                  {Math.round(enhancedMetrics.turnoverRate)}%
                </div>
                <p className="text-xs text-orange-600 mt-1">
                  Stock movement rate
                  {enhancedMetrics.lastSaleDate && (
                    <span className="block">
                      Last sold: {new Date(enhancedMetrics.lastSaleDate).toLocaleDateString()}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Enhanced Progress Bar for Stock Movement */}
            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Stock Movement Analysis</span>
                <span className="text-sm text-gray-600">
                  {enhancedMetrics.totalSales} sold / {item.totalStockedQuantity || 0} total stocked
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: item.totalStockedQuantity > 0 
                      ? `${Math.min(100, (enhancedMetrics.totalSales / item.totalStockedQuantity) * 100)}%`
                      : '0%'
                  }}
                ></div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="text-center">
                  <div className="font-medium text-gray-900">{enhancedMetrics.totalSales}</div>
                  <div className="text-gray-500">Units Sold</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-gray-900">{item.quantityInStock}</div>
                  <div className="text-gray-500">In Stock</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-gray-900">{item.totalStockedQuantity || 0}</div>
                  <div className="text-gray-500">Total Stocked</div>
                </div>
              </div>
              
              {/* Sales Performance Indicators */}
              {itemSalesData && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-500">Sales Transactions:</span>
                      <span className="font-medium text-gray-900 ml-1">{enhancedMetrics.salesCount}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Avg Units/Sale:</span>
                      <span className="font-medium text-gray-900 ml-1">
                        {enhancedMetrics.salesCount > 0 
                          ? (enhancedMetrics.totalSales / enhancedMetrics.salesCount).toFixed(1)
                          : '0'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measure</label>
                <p className="text-gray-900">{item.unitOfMeasure}</p>
              </div>
              {item.supplier && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <p className="text-gray-900">{item.supplier}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Storage Location</label>
                <div className="flex items-center text-gray-900">
                  <MapPin className="w-4 h-4 mr-1 text-gray-500" />
                  {item.location}
                </div>
              </div>
              {item.qrCode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">QR Code</label>
                  <div className="flex items-center text-gray-900">
                    <QrCode className="w-4 h-4 mr-1 text-gray-500" />
                    {item.qrCode}
                  </div>
                </div>
              )}
              {item.notes && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <p className="text-gray-900">{item.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="w-full flex items-center justify-center px-4 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Item
              </button>
              <button 
                onClick={() => setIsAddBatchModalOpen(true)}
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                <Package className="w-4 h-4 mr-2" />
                New Batch
              </button>
              <button 
                onClick={() => setIsStockModalOpen(true)}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Package className="w-4 h-4 mr-2" />
                Update Stock
              </button>
              <button 
                onClick={() => setIsActivityPanelOpen(true)}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                View Activity
              </button>
            </div>
          </div>

          {/* Item Status */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Item Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item)}`}>
                  {getStatusText(item)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Reorder Level</span>
                <span className="text-sm font-medium text-gray-900">{item.reorderLevel} {item.unitOfMeasure.toLowerCase()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Created</span>
                <div className="flex items-center text-sm text-gray-900">
                  <Calendar className="w-4 h-4 mr-1" />
                  {new Date(item.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Updated</span>
                <div className="flex items-center text-sm text-gray-900">
                  <Calendar className="w-4 h-4 mr-1" />
                  {new Date(item.lastUpdated).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Enhanced Performance Summary */}
            <div className="mt-4 pt-4 border-t border-gray-200"></div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Performance Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Stock efficiency:</span>
                  <span className="font-medium text-gray-700">
                    {Math.round(enhancedMetrics.turnoverRate)}% sold
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Revenue per unit stocked:</span>
                  <span className="font-medium text-gray-700">
                    {item.totalStockedQuantity > 0 
                      ? formatCurrency(enhancedMetrics.totalRevenue / item.totalStockedQuantity)
                      : formatCurrency(0)
                    }
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Profit per unit stocked:</span>
                  <span className="font-medium text-gray-700">
                    {item.totalStockedQuantity > 0 
                      ? formatCurrency(enhancedMetrics.totalProfit / item.totalStockedQuantity)
                      : formatCurrency(0)
                    }
                  </span>
                </div>
                {itemSalesData && enhancedMetrics.salesCount > 0 && (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Avg transaction value:</span>
                      <span className="font-medium text-gray-700">
                        {formatCurrency(enhancedMetrics.totalRevenue / enhancedMetrics.salesCount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Sales frequency:</span>
                      <span className="font-medium text-gray-700">
                        {enhancedMetrics.salesCount} transactions
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Stock Alert */}
          {item.quantityInStock <= item.reorderLevel && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800 mb-1">
                    {item.quantityInStock === 0 ? 'Out of Stock!' : 'Low Stock Alert!'}
                  </h3>
                  <p className="text-sm text-yellow-700">
                    {item.quantityInStock === 0 
                      ? 'This item is completely out of stock. Consider restocking immediately.'
                      : `Only ${item.quantityInStock} ${item.unitOfMeasure.toLowerCase()} left. Consider restocking soon.`
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Pricing Information - Full Width Section */}
      <div className="mt-8 bg-white rounded-2xl p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <DollarSign className="w-5 h-5 mr-2 text-gray-600" />
          Pricing Analysis (Using Price of Current Batch)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price</label>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(item.costPrice)}</div>
            <p className="text-xs text-gray-500">What you paid for it</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {itemSalesData ? 'Avg Selling Price' : 'Selling Price'}
            </label>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(enhancedMetrics.averageSellingPrice)}
            </div>
            <p className="text-xs text-gray-500">
              {itemSalesData ? 'Average from actual sales' : 'Current list price'}
            </p>
            {itemSalesData && enhancedMetrics.averageSellingPrice !== item.sellingPrice && (
              <p className="text-xs text-blue-600 mt-1">
                List price: {formatCurrency(item.sellingPrice)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Avg Profit per Item</label>
            <div className="text-2xl font-bold text-teal-600">
              {formatCurrency(enhancedMetrics.averageSellingPrice - item.costPrice)}
            </div>
            <p className="text-xs text-gray-500">
              {itemSalesData ? 'From actual sales data' : 'Based on list price'}
            </p>
          </div>
        </div>

        {/* Enhanced Investment vs Revenue Comparison */}
        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Financial Performance Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-red-600">
                {formatCurrency((item.totalStockedQuantity || 0) * item.costPrice)}
              </div>
              <div className="text-xs text-gray-500">Total Investment</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600">
                {formatCurrency(enhancedMetrics.totalRevenue)}
              </div>
              <div className="text-xs text-gray-500">Revenue Generated</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(enhancedMetrics.totalProfit)}
              </div>
              <div className="text-xs text-gray-500">Total Profit</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-600">
                {item.totalStockedQuantity > 0 
                  ? `${Math.round((enhancedMetrics.totalProfit / ((item.totalStockedQuantity * item.costPrice) || 1)) * 100)}%`
                  : '0%'
                }
              </div>
              <div className="text-xs text-gray-500">ROI</div>
            </div>
          </div>
          
          {/* Break-even Analysis */}
          {item.totalStockedQuantity > 0 && enhancedMetrics.totalProfit < 0 && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="text-center">
                <p className="text-sm text-red-600 font-medium">
                  Need to sell {Math.ceil((item.totalStockedQuantity * item.costPrice) / enhancedMetrics.averageSellingPrice)} more units to break even
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sales History Table - Now using the component */}
        <InventorySalesTable item={item} />
      </div>

      {/* Edit Inventory Modal */}
      <EditInventoryModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditItem}
        item={item}
      />

      {/* Stock Update Modal */}
      <StockUpdateModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        onSubmit={handleStockUpdate}
        item={item}
      />

      {/* Activity Panel */}
      <InventoryActivityPanel
        isOpen={isActivityPanelOpen}
        onClose={() => setIsActivityPanelOpen(false)}
        item={item}
      />

      {/* Add Batch Modal */}
      <AddBatchModal
        isOpen={isAddBatchModalOpen}
        onClose={() => setIsAddBatchModalOpen(false)}
        onSubmit={handleAddBatch}
        item={item}
      />
    </DashboardLayout>
  );
}
