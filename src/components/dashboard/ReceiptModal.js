"use client";
import { X, Download, Printer, FileText, Truck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import DeliveryScheduleModal from "./DeliveryScheduleModal";

export default function ReceiptModal({ isOpen, onClose, sale }) {
  const { secureApiCall } = useAuth();
  const [store, setStore] = useState(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);

  // Fetch store information
  const fetchStoreInfo = async () => {
    try {
      const response = await secureApiCall('/api/stores');
      if (response.success && response.hasStore) {
        setStore(response.data);
      }
    } catch (error) {
      console.error('Error fetching store info:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStoreInfo();
    }
  }, [isOpen]);

  if (!isOpen || !sale) return null;

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

  // Generate receipt HTML content
  const generateReceiptHTML = () => {
    const storeName = store?.storeName || 'IVMA STORE';
    const storeAddress = store?.storeType === 'physical' && store?.fullAddress ? store.fullAddress : '';
    const storePhone = store?.storePhone || '';
    const storeEmail = store?.storeEmail || '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${sale.transactionId}</title>
        <style>
          body { 
            font-family: 'Courier New', monospace; 
            margin: 20px; 
            max-width: 300px; 
            font-size: 12px; 
            line-height: 1.4;
          }
          .header { 
            text-align: center; 
            border-bottom: 1px dashed #000; 
            padding-bottom: 10px; 
            margin-bottom: 10px;
          }
          .store-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .store-info {
            font-size: 10px;
            margin-bottom: 2px;
          }
          .item { 
            display: flex; 
            justify-content: space-between; 
            margin: 3px 0; 
          }
          .total { 
            border-top: 1px dashed #000; 
            padding-top: 10px; 
            font-weight: bold; 
            margin-top: 10px;
          }
          .footer { 
            text-align: center; 
            margin-top: 20px; 
            border-top: 1px dashed #000; 
            padding-top: 10px; 
          }
          .powered-by {
            font-size: 8px;
            color: #666;
            margin-top: 10px;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="store-name">${storeName}</div>
          ${storeAddress ? `<div class="store-info">${storeAddress}</div>` : ''}
          ${storePhone ? `<div class="store-info">Tel: ${storePhone}</div>` : ''}
          ${storeEmail ? `<div class="store-info">Email: ${storeEmail}</div>` : ''}
          <p style="margin-top: 10px;">Receipt #${sale.transactionId}</p>
          <p>${formatDate(sale.saleDate)}</p>
        </div>
        
        <div style="margin: 10px 0;">
          ${sale.customer.name ? `<p>Customer: ${sale.customer.name}</p>` : ''}
          ${sale.customer.phone ? `<p>Phone: ${sale.customer.phone}</p>` : ''}
        </div>

        <div>
          ${sale.items.map(item => `
            <div class="item">
              <span>${item.productName} x${item.quantity}</span>
              <span>${formatCurrency(item.total)}</span>
            </div>
          `).join('')}
        </div>

        <div class="total">
          <div class="item">
            <span>Subtotal:</span>
            <span>${formatCurrency(sale.subtotal)}</span>
          </div>
          ${sale.discount > 0 ? `
            <div class="item">
              <span>Discount:</span>
              <span>-${formatCurrency(sale.discount)}</span>
            </div>
          ` : ''}
          ${sale.tax > 0 ? `
            <div class="item">
              <span>Tax:</span>
              <span>${formatCurrency(sale.tax)}</span>
            </div>
          ` : ''}
          <div class="item" style="font-size: 14px; margin-top: 5px;">
            <span>TOTAL:</span>
            <span>${formatCurrency(sale.total)}</span>
          </div>
          <div class="item">
            <span>Payment (${sale.paymentMethod}):</span>
            <span>${formatCurrency(sale.amountReceived)}</span>
          </div>
          ${sale.balance > 0 ? `
            <div class="item">
              <span>Change:</span>
              <span>${formatCurrency(sale.balance)}</span>
            </div>
          ` : ''}
        </div>

        <div class="footer">
          <p>${store?.settings?.receiptFooter || 'Thank you for your business!'}</p>
          <p>Please come again</p>
          <div class="powered-by">
            <p>Powered by IVMA</p>
            <p>ivma.ng</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Print receipt
  const printReceipt = () => {
    let receiptWindow;
    try {
      receiptWindow = window.open('', '_blank', 'width=300,height=600');
    } catch (error) {
      console.error('Failed to open popup window:', error);
    }

    if (!receiptWindow || receiptWindow.closed || typeof receiptWindow.closed === 'undefined') {
      // Popup blocked - show alert
      alert('Popup blocked! Please allow popups for printing receipts or use the download option.');
      return;
    }

    const receiptHTML = generateReceiptHTML() + `
      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() {
            window.close();
          }, 1000);
        }
      </script>
    `;
    
    try {
      receiptWindow.document.write(receiptHTML);
      receiptWindow.document.close();
    } catch (error) {
      console.error('Error writing to receipt window:', error);
      receiptWindow.close();
      alert('Printing failed! Please use the download option or enable popups.');
    }
  };

  // Download receipt as HTML file
  const downloadReceipt = () => {
    try {
      const receiptHTML = generateReceiptHTML();
      const blob = new Blob([receiptHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `Receipt_${sale.transactionId}_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // Show success message
      alert('Receipt downloaded successfully! You can open the HTML file in your browser and print it.');
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed! Please try again.');
    }
  };

  // Download as text file (fallback)
  const downloadReceiptAsText = () => {
    try {
      const storeName = store?.storeName || 'IVMA STORE';
      const storeAddress = store?.storeType === 'physical' && store?.fullAddress ? store.fullAddress : '';
      const storePhone = store?.storePhone || '';
      const storeEmail = store?.storeEmail || '';
      
      const receiptText = `
${storeName}
${storeAddress ? storeAddress + '\n' : ''}${storePhone ? 'Tel: ' + storePhone + '\n' : ''}${storeEmail ? 'Email: ' + storeEmail + '\n' : ''}
Receipt #${sale.transactionId}
${formatDate(sale.saleDate)}

${sale.customer.name ? `Customer: ${sale.customer.name}\n` : ''}${sale.customer.phone ? `Phone: ${sale.customer.phone}\n` : ''}

Items:
${sale.items.map(item => `${item.productName} x${item.quantity} - ${formatCurrency(item.total)}`).join('\n')}

Subtotal: ${formatCurrency(sale.subtotal)}${sale.discount > 0 ? `\nDiscount: -${formatCurrency(sale.discount)}` : ''}${sale.tax > 0 ? `\nTax: ${formatCurrency(sale.tax)}` : ''}
TOTAL: ${formatCurrency(sale.total)}
Payment (${sale.paymentMethod}): ${formatCurrency(sale.amountReceived)}${sale.balance > 0 ? `\nChange: ${formatCurrency(sale.balance)}` : ''}

${store?.settings?.receiptFooter || 'Thank you for your business!'}
Please come again

Powered by IVMA
ivma.ng
      `;

      const blob = new Blob([receiptText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `Receipt_${sale.transactionId}_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Text download failed:', error);
      alert('Download failed! Please try again.');
    }
  };

  // Download receipt as PDF
  const downloadReceiptAsPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 160] // Slightly taller for store info and IVMA branding
      });

      doc.setFont('courier', 'normal');
      
      let yPosition = 8;
      const lineHeight = 3.5;
      const pageWidth = 80;
      const margin = 3;
      const contentWidth = pageWidth - (margin * 2);
      
      // Helper functions
      const addCenteredText = (text, fontSize = 10, isBold = false) => {
        doc.setFontSize(fontSize);
        if (isBold) doc.setFont('courier', 'bold');
        else doc.setFont('courier', 'normal');
        
        const textWidth = doc.getTextWidth(text);
        const x = (pageWidth - textWidth) / 2;
        doc.text(text, Math.max(margin, x), yPosition);
        yPosition += lineHeight;
      };

      const addLeftRightText = (leftText, rightText, fontSize = 8) => {
        doc.setFontSize(fontSize);
        doc.setFont('courier', 'normal');
        
        const rightTextWidth = doc.getTextWidth(rightText);
        const availableLeftWidth = contentWidth - rightTextWidth - 3;
        
        let displayLeftText = leftText;
        while (doc.getTextWidth(displayLeftText) > availableLeftWidth && displayLeftText.length > 3) {
          displayLeftText = displayLeftText.slice(0, -4) + '...';
        }
        
        doc.text(displayLeftText, margin, yPosition);
        doc.text(rightText, pageWidth - margin - rightTextWidth, yPosition);
        yPosition += lineHeight;
      };

      // Store Header
      const storeName = store?.storeName || 'IVMA STORE';
      addCenteredText(storeName, 12, true);
      
      // Store info
      if (store?.storeType === 'physical' && store?.fullAddress) {
        doc.setFontSize(7);
        doc.setFont('courier', 'normal');
        const addressLines = store.fullAddress.split(', ');
        addressLines.forEach(line => {
          addCenteredText(line, 7);
        });
      }
      
      if (store?.storePhone) {
        addCenteredText(`Tel: ${store.storePhone}`, 7);
      }
      
      if (store?.storeEmail) {
        addCenteredText(`Email: ${store.storeEmail}`, 7);
      }
      
      yPosition += 1;
      addCenteredText(`#${sale.transactionId}`, 9);
      addCenteredText(formatDate(sale.saleDate), 7);
      
      // Add separator line
      yPosition += 1;
      doc.setLineWidth(0.1);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 3;

      // Customer info (if available)
      if (sale.customer.name || sale.customer.phone) {
        doc.setFontSize(7);
        doc.setFont('courier', 'normal');
        if (sale.customer.name) {
          doc.text(`Customer: ${sale.customer.name}`, margin, yPosition);
          yPosition += lineHeight;
        }
        if (sale.customer.phone) {
          doc.text(`Phone: ${sale.customer.phone}`, margin, yPosition);
          yPosition += lineHeight;
        }
        yPosition += 1;
      }

      // Items
      doc.setFontSize(7);
      doc.setFont('courier', 'bold');
      doc.text('ITEMS:', margin, yPosition);
      yPosition += lineHeight + 0.5;

      sale.items.forEach(item => {
        doc.setFont('courier', 'normal');
        const productLine = `${item.productName} x${item.quantity}`;
        const priceText = formatCurrency(item.total);
        addLeftRightText(productLine, priceText, 7);
      });

      // Separator line
      yPosition += 1;
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 3;

      // Totals
      doc.setFont('courier', 'normal');
      addLeftRightText('Subtotal:', formatCurrency(sale.subtotal), 7);
      
      if (sale.discount > 0) {
        addLeftRightText('Discount:', `-${formatCurrency(sale.discount)}`, 7);
      }
      
      if (sale.tax > 0) {
        addLeftRightText('Tax:', formatCurrency(sale.tax), 7);
      }

      // Total line separator
      yPosition += 0.5;
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 2.5;

      // Total (bold and larger)
      doc.setFontSize(9);
      doc.setFont('courier', 'bold');
      addLeftRightText('TOTAL:', formatCurrency(sale.total), 9);

      // Payment info
      yPosition += 1;
      doc.setFontSize(7);
      doc.setFont('courier', 'normal');
      addLeftRightText(`Paid (${sale.paymentMethod}):`, formatCurrency(sale.amountReceived), 7);
      
      if (sale.balance > 0) {
        addLeftRightText('Change:', formatCurrency(sale.balance), 7);
      }

      // Footer separator
      yPosition += 2;
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 3;

      // Receipt footer message
      const footerMessage = store?.settings?.receiptFooter || 'Thank you for your business!';
      addCenteredText(footerMessage, 7);
      addCenteredText('Please come again', 7);
      
      // IVMA branding
      yPosition += 2;
      doc.setFontSize(6);
      doc.setFont('courier', 'normal');
      addCenteredText('Powered by IVMA', 6);
      addCenteredText('ivma.ng', 6);

      // Save the PDF
      doc.save(`Receipt_${sale.transactionId}_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('PDF generation failed! Please try downloading as HTML instead.');
    }
  };

  // Handle delivery scheduling
  const handleScheduleDelivery = async (deliveryData) => {
    try {
      const response = await secureApiCall('/api/deliveries', {
        method: 'POST',
        body: JSON.stringify({
          saleId: sale._id,
          transactionId: sale.transactionId,
          ...deliveryData
        })
      });

      if (response.success) {
        alert('Delivery scheduled successfully!');
        setIsDeliveryModalOpen(false);
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Error scheduling delivery:', error);
      throw error;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Receipt Details</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Receipt Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          <div className="text-center mb-6">
            <h4 className="text-xl font-bold text-gray-900">{store?.storeName || 'IVMA STORE'}</h4>
            {store?.storeType === 'physical' && store?.fullAddress && (
              <p className="text-sm text-gray-600 mt-1">{store.fullAddress}</p>
            )}
            {store?.storePhone && (
              <p className="text-sm text-gray-600">Tel: {store.storePhone}</p>
            )}
            {store?.storeEmail && (
              <p className="text-sm text-gray-600">Email: {store.storeEmail}</p>
            )}
            <p className="text-sm text-gray-600 mt-2">Receipt #{sale.transactionId}</p>
            <p className="text-sm text-gray-600">{formatDate(sale.saleDate)}</p>
          </div>

          {(sale.customer.name || sale.customer.phone) && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <h5 className="text-sm font-medium text-gray-900 mb-2">Customer Information</h5>
              {sale.customer.name && (
                <p className="text-sm text-gray-600">Name: {sale.customer.name}</p>
              )}
              {sale.customer.phone && (
                <p className="text-sm text-gray-600">Phone: {sale.customer.phone}</p>
              )}
            </div>
          )}

          <div className="mb-4">
            <h5 className="text-sm font-medium text-gray-900 mb-3">Items Purchased</h5>
            <div className="space-y-2">
              {sale.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.productName} x{item.quantity}</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="text-gray-900">{formatCurrency(sale.subtotal)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount:</span>
                  <span className="text-red-600">-{formatCurrency(sale.discount)}</span>
                </div>
              )}
              {sale.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax:</span>
                  <span className="text-gray-900">{formatCurrency(sale.tax)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                <span className="text-gray-600">Total:</span>
                <span className="text-gray-900">{formatCurrency(sale.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Payment (${sale.paymentMethod}):</span>
                <span className="text-gray-900">{formatCurrency(sale.amountReceived)}</span>
              </div>
              {sale.balance > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Change:</span>
                  <span className="text-green-600">{formatCurrency(sale.balance)}</span>
                </div>
              )}
            </div>
          </div>

          {/* IVMA Branding */}
          <div className="text-center mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">Powered by IVMA</p>
            <p className="text-xs text-gray-400">ivma.ng</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex space-x-2">
            <button
              onClick={printReceipt}
              className="flex items-center justify-center px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Print
            </button>
            
            {/* Add Delivery Scheduling Button */}
            <button
              onClick={() => setIsDeliveryModalOpen(true)}
              className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Truck className="w-4 h-4 mr-1.5" />
              Schedule Delivery
            </button>
            
            <button
              onClick={downloadReceiptAsPDF}
              className="flex items-center justify-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              title="Download as PDF"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              PDF
            </button>
            <button
              onClick={downloadReceipt}
              className="flex items-center justify-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              title="Download as HTML"
            >
              <Download className="w-4 h-4 mr-1.5" />
              HTML
            </button>
            <button
              onClick={downloadReceiptAsText}
              className="flex items-center justify-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              title="Download as Text"
            >
              <Download className="w-4 h-4 mr-1.5" />
              TXT
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Print for immediate use, or download as PDF/HTML for best quality
          </p>
        </div>
      </div>

      {/* Delivery Schedule Modal */}
      <DeliveryScheduleModal
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
        onSubmit={handleScheduleDelivery}
        sale={sale}
      />
    </div>
  );
}
