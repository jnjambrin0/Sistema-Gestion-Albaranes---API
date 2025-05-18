const PDFDocument = require('pdfkit');

const generatePDF = (deliveryNote, project, client, signatureUrl = null, signedBy = null) => {
  return new Promise((resolve, reject) => {
    try {

      // Validar objetos requeridos
      if (!deliveryNote || !project || !client) {
        return reject(new Error('Faltan objetos requeridos para la generación de PDF'));
      }
      
      const doc = new PDFDocument({ margin: 50 });
      
      // Buffer para almacenar el PDF
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      
      doc.on('error', (err) => {
        reject(err);
      });
      
      // Configuración de estilos
      const titleFont = 'Helvetica-Bold';
      const normalFont = 'Helvetica';
      const titleFontSize = 16;
      const subtitleFontSize = 14;
      const normalFontSize = 12;
      const smallFontSize = 10;
      
      doc.font(titleFont)
         .fontSize(titleFontSize)
         .text('ALBARÁN', { align: 'center' })
         .moveDown();
      
      doc.font(titleFont)
         .fontSize(subtitleFontSize)
         .text('Información del Albarán')
         .moveDown(0.5);
      
      doc.font(normalFont)
         .fontSize(normalFontSize)
         .text(`Número: ${deliveryNote.number || 'Sin número'}`)
         .text(`Fecha: ${new Date(deliveryNote.date).toLocaleDateString()}`)
         .text(`Proyecto: ${project.name}`)
         .moveDown();
      
      doc.font(titleFont)
         .fontSize(subtitleFontSize)
         .text('Cliente')
         .moveDown(0.5);
      
      doc.font(normalFont)
         .fontSize(normalFontSize)
         .text(`Nombre: ${client.name}`)
         .text(`NIF/CIF: ${client.CIF || 'No especificado'}`);
      
      if (client.PersonaContacto) {
        doc.text(`Contacto: ${client.PersonaContacto}`);
      }
      
      if (client.email) {
        doc.text(`Email: ${client.email}`);
      }
      
      if (client.telefono) {
        doc.text(`Teléfono: ${client.telefono}`);
      }
      
      if (client.direccion) {
        try {
          let direccionText = '';
          if (typeof client.direccion === 'string') {
            direccionText = client.direccion;
          } else {
            if (client.direccion.calle) direccionText += client.direccion.calle;
            if (client.direccion.ciudad) {
              if (direccionText) direccionText += ', ';
              direccionText += client.direccion.ciudad;
            }
            if (client.direccion.CP) {
              if (direccionText) direccionText += ', ';
              direccionText += client.direccion.CP;
            }
            if (client.direccion.pais) {
              if (direccionText) direccionText += ', ';
              direccionText += client.direccion.pais;
            }
          }
          
          if (direccionText) {
            doc.text(`Dirección: ${direccionText}`);
          }
        } catch (direccionErr) {
          console.error('[!!] Error procesando dirección:', direccionErr);
        }
      }
      
      doc.moveDown();
      
      doc.font(titleFont)
         .fontSize(subtitleFontSize)
         .text('Detalle de Items')
         .moveDown(0.5);
      
      const tableTop = doc.y;
      const tableHeaders = ['Descripción', 'Cantidad', 'Unidad', 'Precio', 'Importe'];
      const tableColumnWidths = [240, 70, 70, 70, 70];
      
      let currentX = 50;
      doc.font(titleFont)
         .fontSize(normalFontSize);
      
      tableHeaders.forEach((header, i) => {
        doc.text(header, currentX, tableTop, {
          width: tableColumnWidths[i],
          align: i > 0 ? 'right' : 'left'
        });
        currentX += tableColumnWidths[i];
      });
      
      doc.moveTo(50, tableTop + 20)
         .lineTo(550, tableTop + 20)
         .stroke();
      
      // Dibujar filas de la tabla
      let currentY = tableTop + 30;
      doc.font(normalFont)
         .fontSize(smallFontSize);
      
      try {
        if (!deliveryNote.items || !Array.isArray(deliveryNote.items) || deliveryNote.items.length === 0) {
          doc.text('No hay items en este albarán', 50, currentY);
          currentY += 20;
        } else {
          deliveryNote.items.forEach(item => {
            currentX = 50;
            
            doc.text(item.description || 'Sin descripción', currentX, currentY, {
              width: tableColumnWidths[0],
              align: 'left'
            });
            currentX += tableColumnWidths[0];
            
            doc.text(item.cantidad ? item.cantidad.toString() : '0', currentX, currentY, {
              width: tableColumnWidths[1],
              align: 'right'
            });
            currentX += tableColumnWidths[1];
            
            // Unidad
            const unidadLabels = {
              hour: 'Horas',
              unidad: 'Unidades',
              kg: 'Kg',
              metros: 'Metros',
              litro: 'Litros'
            };
            
            const unidadLabel = item.unidad ? (unidadLabels[item.unidad] || item.unidad) : 'N/A';
            doc.text(unidadLabel, currentX, currentY, {
              width: tableColumnWidths[2],
              align: 'right'
            });
            currentX += tableColumnWidths[2];
            
            doc.text(item.precioUnidad ? `${item.precioUnidad.toFixed(2)} €` : '-', currentX, currentY, {
              width: tableColumnWidths[3],
              align: 'right'
            });
            currentX += tableColumnWidths[3];
            
            doc.text(item.cantidad ? `${item.cantidad.toFixed(2)} €` : '-', currentX, currentY, {
              width: tableColumnWidths[4],
              align: 'right'
            });
            
            currentY += 20;
          });
        }
      } catch (itemsError) {
        console.error('[ERROR] Error procesando ítems:', itemsError);
        doc.text('Error al procesar los ítems', 50, currentY);
        currentY += 20;
      }
      
      doc.moveTo(50, currentY)
         .lineTo(550, currentY)
         .stroke();
      
      doc.font(titleFont)
         .fontSize(normalFontSize)
         .text('Total:', 380, currentY + 10, {
           width: 100,
           align: 'right'
         });
      
      const totalcantidad = deliveryNote.totalcantidad || 0;
      doc.text(`${totalcantidad.toFixed(2)} €`, 480, currentY + 10, {
        width: 70,
        align: 'right'
      });
      
      doc.moveDown(2);
      
      if (deliveryNote.notes) {
        doc.font(titleFont)
           .fontSize(subtitleFontSize)
           .text('Notas')
           .moveDown(0.5);
        
        doc.font(normalFont)
           .fontSize(normalFontSize)
           .text(deliveryNote.notes)
           .moveDown();
      }
      
      if (signatureUrl) {
        doc.font(titleFont)
           .fontSize(subtitleFontSize)
           .text('Firma Cliente')
           .moveDown(0.5);
        
        try {
          doc.image(signatureUrl, {
            width: 200
          });
        } catch (signatureError) {
          doc.text('Error al cargar imagen de firma', { align: 'center' });
        }
        
        doc.font(normalFont)
           .fontSize(normalFontSize)
           .text(`Firmado por: ${signedBy || 'No especificado'}`)
           .text(`Fecha: ${new Date().toLocaleDateString()}`)
           .moveDown();
      } else {
        doc.font(titleFont)
           .fontSize(subtitleFontSize)
           .text('Firma Cliente')
           .moveDown(0.5);
        
        doc.font(normalFont)
           .fontSize(normalFontSize)
           .text('Espacio reservado para la firma')
           .moveDown(4);
        
        doc.font(normalFont)
           .fontSize(normalFontSize)
           .text('Nombre: _______________________________')
           .moveDown(0.5)
           .text('Fecha: _______________________________')
           .moveDown();
      }
      
      // Añadimos pie de página con información adicional
      const pageHeight = doc.page.height;
      doc.font(normalFont)
         .fontSize(8)
         .text(`Albarán generado automáticamente el ${new Date().toLocaleString()}`, 50, pageHeight - 50, {
           align: 'center'
         });
      
      // Finalizamos el documento
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generatePDF };