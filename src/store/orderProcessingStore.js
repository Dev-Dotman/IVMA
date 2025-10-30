import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useOrderProcessingStore = create(
  persist(
    (set, get) => ({
      // Current order being processed
      processingOrder: null,
      
      // POS cart state from order
      orderCart: [],
      orderCustomer: null,
      
      // Processing state
      isProcessingOrder: false,
      
      // Set order for processing
      setProcessingOrder: (order) => {
        set({
          processingOrder: order,
          isProcessingOrder: true,
          orderCart: order.items.map(item => ({
            _id: item.product || item.inventoryId,
            productName: item.productSnapshot.productName,
            sku: item.productSnapshot.sku,
            sellingPrice: item.price,
            quantityInStock: 999, // We'll verify this in POS
            quantity: item.quantity,
            category: item.productSnapshot.category || 'General',
            brand: item.productSnapshot.brand || '',
            unitOfMeasure: item.productSnapshot.unitOfMeasure || 'Piece',
            image: item.productSnapshot.image || null,
            // Add order-specific data
            orderItemId: item._id,
            isOrderItem: true
          })),
          orderCustomer: {
            name: `${order.customerSnapshot.firstName} ${order.customerSnapshot.lastName}`,
            phone: order.customerSnapshot.phone || order.shippingAddress.phone,
            email: order.customerSnapshot.email || ''
          }
        });
      },
      
      // Clear processing state
      clearProcessingOrder: () => {
        set({
          processingOrder: null,
          orderCart: [],
          orderCustomer: null,
          isProcessingOrder: false
        });
      },
      
      // Update cart during processing
      updateOrderCart: (cart) => {
        set({ orderCart: cart });
      },
      
      // Update customer during processing
      updateOrderCustomer: (customer) => {
        set({ orderCustomer: customer });
      },
      
      // Complete order processing
      completeOrderProcessing: () => {
        const state = get();
        set({
          processingOrder: null,
          orderCart: [],
          orderCustomer: null,
          isProcessingOrder: false
        });
        return state.processingOrder;
      }
    }),
    {
      name: 'order-processing-storage',
      partialize: (state) => ({
        processingOrder: state.processingOrder,
        orderCart: state.orderCart,
        orderCustomer: state.orderCustomer,
        isProcessingOrder: state.isProcessingOrder
      })
    }
  )
);

export default useOrderProcessingStore;
