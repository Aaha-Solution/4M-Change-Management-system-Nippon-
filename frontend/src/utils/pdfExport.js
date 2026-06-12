import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDateToDDMMYYYY } from './dateUtils';
import { getSyncedDate } from './timeSync';

/**
 * Exports the filtered requests list to a landscape A4 PDF.
 * @param {Array} filteredData 
 * @param {Object} filtersInfo 
 * @param {Function} setToastMsg 
 */
export const exportRequestsListPDF = (filteredData, filtersInfo = {}, setToastMsg) => {
  try {
    if (!filteredData || filteredData.length === 0) {
      setToastMsg?.('No data available to export.');
      return;
    }

    const {
      searchQuery = '',
      selectedMonth = 'All',
      selectedPerson = 'All',
      selectedProcess = 'All',
      selectedMachine = 'All',
      fromDate = '',
      toDate = ''
    } = filtersInfo;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4'
    });

    // Headers for A4 Landscape Table
    const headers = [['SL. NO.', 'CHANGE NO.', 'MACHINE NO.', 'DEPARTMENT', 'PROCESS NAME', 'REQUESTER', 'REQUEST DATE', 'STATUS']];

    // Format row values from filteredData
    const tableData = filteredData.map((item, idx) => [
      idx + 1,
      item.id,
      item.machineNo,
      item.department,
      item.processName,
      item.requester ? item.requester.split('@')[0] : '-',
      item.date,
      item.status
    ]);

    // Title & Branding (Blue theme)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 102, 204); // #0066cc
    doc.text('4M Change Management System', 40, 45);

    // Metadata details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Exported Date: ${formatDateToDDMMYYYY(getSyncedDate())}`, 40, 60);

    const filterParts = [];
    if (searchQuery) filterParts.push(`Search: "${searchQuery}"`);
    if (selectedMonth !== 'All') filterParts.push(`Month: "${selectedMonth}"`);
    if (fromDate) filterParts.push(`From: "${fromDate}"`);
    if (toDate) filterParts.push(`To: "${toDate}"`);
    if (selectedPerson !== 'All') filterParts.push(`Person: "${selectedPerson.split('@')[0]}"`);
    if (selectedProcess !== 'All') filterParts.push(`Process: "${selectedProcess}"`);
    if (selectedMachine !== 'All') filterParts.push(`Machine: "${selectedMachine}"`);

    const filterText = filterParts.length > 0 
      ? `Active Filters -> ${filterParts.join(', ')}`
      : 'Active Filters -> None';

    doc.text(filterText, 40, 75);

    // AutoTable generator
    autoTable(doc, {
      startY: 90,
      head: headers,
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [0, 102, 204],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'left'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [51, 65, 85] // Slate-700
      },
      columnStyles: {
        0: { cellWidth: 50 },  // SL. NO.
        1: { cellWidth: 90, fontStyle: 'bold' },  // CHANGE NO.
        2: { cellWidth: 90 },  // MACHINE NO.
        3: { cellWidth: 110 }, // DEPARTMENT
        4: { cellWidth: 120 }, // PROCESS NAME
        5: { cellWidth: 110 }, // REQUESTER
        6: { cellWidth: 90 },  // REQUEST DATE
        7: { cellWidth: 100 }  // STATUS
      },
      margin: { top: 40, bottom: 40, left: 40, right: 40 },
      didDrawPage: (data) => {
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // Slate-400
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, doc.internal.pageSize.width - 80, doc.internal.pageSize.height - 20);
        doc.text('NIPPON QUALITY ASSURANCE - CONFIDENTIAL', 40, doc.internal.pageSize.height - 20);
      }
    });

    doc.save(`4M_Change_Requests_${formatDateToDDMMYYYY(getSyncedDate()).replace(/\//g, '-')}.pdf`);
    setToastMsg?.('PDF exported successfully!');
  } catch (error) {
    console.error('Error generating PDF:', error);
    setToastMsg?.('Error generating PDF export.');
  }
};

/**
 * Exports a single request's complete L1, L2, L3 details to a portrait A4 PDF.
 * @param {Object} selectedL1Details 
 * @param {Object} selectedL2Details 
 * @param {Object} selectedLog 
 * @param {Function} setToastMsg 
 */
export const exportRequestDetailsPDF = (selectedL1Details, selectedL2Details, selectedLog, setToastMsg) => {
  try {
    if (!selectedL1Details) {
      setToastMsg?.('Level 1 request details are not loaded.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const primaryColor = [0, 102, 204]; // #0066cc
    const textColor = [51, 65, 85];    // Slate-700
    const lightBg = [248, 250, 252];    // Slate-50

    // Title & Header Branding
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('4M Change Request Detail Report', 40, 45);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text(`Generated on: ${formatDateToDDMMYYYY(getSyncedDate())}`, doc.internal.pageSize.width - 160, 45);

    // Section 1: General Info
    const generalInfoData = [
      [
        { content: 'Change Number:', fontStyle: 'bold' }, selectedL1Details.change_no || '-',
        { content: 'Status:', fontStyle: 'bold' }, `L1: ${selectedL1Details.crStatus || '-'}`,
      ],
      [
        { content: 'Requested By:', fontStyle: 'bold' }, `${selectedL1Details.request_by || '-'} (${selectedL1Details.crRequester || '-'})`,
        { content: 'Date/Time:', fontStyle: 'bold' }, `${selectedL1Details.crDate ? formatDateToDDMMYYYY(selectedL1Details.crDate) : '-'} ${selectedL1Details.requested_time || ''}`,
      ],
      [
        { content: 'Department:', fontStyle: 'bold' }, selectedL1Details.dept || '-',
        { content: 'Change Type:', fontStyle: 'bold' }, selectedL1Details.change_type || '-',
      ],
      [
        { content: 'Unit:', fontStyle: 'bold' }, selectedL1Details.unit || '-',
        { content: 'Change In:', fontStyle: 'bold' }, selectedL1Details.change_in || '-',
      ],
      [
        { content: 'Process Name:', fontStyle: 'bold' }, selectedL1Details.process_name || '-',
        { content: 'Process Line:', fontStyle: 'bold' }, selectedL1Details.process_line || '-',
      ],
      [
        { content: 'Machine No:', fontStyle: 'bold' }, selectedL1Details.machine_no || '-',
        { content: 'Target Date range:', fontStyle: 'bold' }, `${selectedL1Details.date_start ? formatDateToDDMMYYYY(selectedL1Details.date_start) : '-'} to ${selectedL1Details.date_close ? formatDateToDDMMYYYY(selectedL1Details.date_close) : '-'}`,
      ],
      [
        { content: 'Change Title:', fontStyle: 'bold' }, { content: selectedL1Details.title || '-', colSpan: 3 }
      ]
    ];

    autoTable(doc, {
      startY: 65,
      head: [[{ content: '1. GENERAL INFORMATION', colSpan: 4 }]],
      body: generalInfoData,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: textColor
      },
      columnStyles: {
        0: { cellWidth: 90, fillColor: lightBg, fontStyle: 'bold' },
        1: { cellWidth: 165 },
        2: { cellWidth: 95, fillColor: lightBg, fontStyle: 'bold' },
        3: { cellWidth: 165 }
      },
      margin: { left: 40, right: 40 }
    });

    // Section 2: Details & Justification
    const detailsData = [
      [
        { content: 'Change Description:', fontStyle: 'bold' },
        selectedL1Details.description || '-'
      ],
      [
        { content: 'Area of Improvement / Benefit:', fontStyle: 'bold' },
        selectedL1Details.improvement_area || '-'
      ],
      [
        { content: 'Traceability FROM (Before Change):', fontStyle: 'bold' },
        selectedL1Details.trace_from || '-'
      ],
      [
        { content: 'Traceability TO (After Change):', fontStyle: 'bold' },
        selectedL1Details.trace_to || '-'
      ],
      [
        { content: 'Risk Analysis & Mitigations:', fontStyle: 'bold' },
        selectedL1Details.risk_analysis || '-'
      ],
      [
        { content: 'SOP / WI / Control Plan Update:', fontStyle: 'bold' },
        selectedL1Details.sop_update || '-'
      ],
      [
        { content: 'Effectiveness Monitoring:', fontStyle: 'bold' },
        selectedL1Details.effectiveness_monitoring || '-'
      ],
      [
        { content: 'Approvals & Cust. Req:', fontStyle: 'bold' },
        `HOD Approval: ${selectedL1Details.hod_approval || '-'}  |  Customer Approval Required: ${selectedL1Details.customer_approval || '-'}`
      ]
    ];

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 15,
      head: [[{ content: '2. CHANGE DETAILS & JUSTIFICATION', colSpan: 2 }]],
      body: detailsData,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: textColor
      },
      columnStyles: {
        0: { cellWidth: 140, fillColor: lightBg, fontStyle: 'bold' },
        1: { cellWidth: 375 }
      },
      margin: { left: 40, right: 40 }
    });

    // Section 3: Level 2 Validation Details
    const l2Data = [];
    if (selectedL2Details) {
      l2Data.push(
        [
          { content: 'Validated By:', fontStyle: 'bold' }, selectedL2Details.requester || '-',
          { content: 'Validation Date:', fontStyle: 'bold' }, selectedL2Details.date || '-'
        ],
        [
          { content: 'Validation Status:', fontStyle: 'bold' }, `L2: ${selectedL2Details.status || 'Pending'}`,
          { content: 'PED Test Setup:', fontStyle: 'bold' }, selectedL2Details.weldTest || '-'
        ],
        [
          { content: 'QA setup attachment:', fontStyle: 'bold' }, selectedL2Details.qaTest || '-',
          { content: 'Remarks:', fontStyle: 'bold' }, selectedL2Details.remarks || '-'
        ]
      );
    } else {
      l2Data.push([
        { content: 'Status:', fontStyle: 'bold' }, { content: 'Level 2 Validation details are currently pending or not submitted.', colSpan: 3 }
      ]);
    }

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 15,
      head: [[{ content: '3. LEVEL 2 VALIDATION DETAILS', colSpan: 4 }]],
      body: l2Data,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: textColor
      },
      columnStyles: {
        0: { cellWidth: 100, fillColor: lightBg, fontStyle: 'bold' },
        1: { cellWidth: 155 },
        2: { cellWidth: 105, fillColor: lightBg, fontStyle: 'bold' },
        3: { cellWidth: 155 }
      },
      margin: { left: 40, right: 40 }
    });

    // Section 4: Level 3 Approval Matrix
    if (selectedLog) {
      const l3Headers = [['DEPARTMENT', 'APPROVAL STATUS']];
      const l3Rows = [
        ['PED (Process Engineering)', selectedLog.ped || 'Pending'],
        ['Quality Assurance', selectedLog.quality || 'Pending'],
        ['Production', selectedLog.production || 'Pending'],
        ['Maintenance', selectedLog.maintenance || 'Pending'],
        ['PC & L (Prod. Control & Logistics)', selectedLog.pcl || 'Pending'],
        ['Materials Management', selectedLog.materials || 'Pending'],
        ['Marketing / Sales', selectedLog.marketing || 'Pending'],
        ['Human Resources (HR)', selectedLog.hr || 'Pending'],
        ['Environment, Health & Safety (EHS)', selectedLog.safety || 'Pending'],
        ['Unit Head / Plant Manager', selectedLog.unitHead || selectedLog.unit_head || 'Pending']
      ];

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 15,
        head: [[{ content: '4. LEVEL 3 FINAL APPROVAL MATRIX', colSpan: 2 }]],
        body: [
          ...l3Headers,
          ...l3Rows
        ],
        theme: 'grid',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 8.5,
          textColor: textColor
        },
        columnStyles: {
          0: { cellWidth: 255, fillColor: lightBg, fontStyle: 'bold' },
          1: { cellWidth: 260 }
        },
        margin: { left: 40, right: 40 },
        didParseCell: (data) => {
          if (data.row.index === 0) {
            data.cell.styles.fillColor = [226, 232, 240]; // Slate-200
            data.cell.styles.textColor = [15, 23, 42];    // Slate-900
            data.cell.styles.fontStyle = 'bold';
          } else if (data.column.index === 1 && data.row.index > 0) {
            const val = data.cell.text[0];
            if (val === 'Accepted' || val === 'Approved') {
              data.cell.styles.textColor = [16, 124, 65]; // Green text
              data.cell.styles.fontStyle = 'bold';
            } else if (val === 'Rejected') {
              data.cell.styles.textColor = [220, 38, 38]; // Red text
              data.cell.styles.fontStyle = 'bold';
            } else if (val === 'Pending') {
              data.cell.styles.textColor = [217, 119, 6]; // Amber text
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });
    }

    // Add Footer & Pages count
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // Slate-400
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 80, doc.internal.pageSize.height - 20);
      doc.text('NIPPON QUALITY ASSURANCE - CONFIDENTIAL CHANGE REQUEST REPORT', 40, doc.internal.pageSize.height - 20);
    }

    doc.save(`CMS_Detail_Report_${selectedL1Details.change_no}.pdf`);
    setToastMsg?.('Request details exported successfully!');
  } catch (error) {
    console.error('Error generating detailed PDF:', error);
    setToastMsg?.('Error generating detailed PDF export.');
  }
};
