import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDateToDDMMYYYY } from './dateUtils';
import { getRequestDisplayStatus } from './statusUtils';
import { getSyncedDate } from './timeSync';
import nipponLogoUrl from '../assets/Nippon Logo.png';

/**
 * Adds the Nippon logo to the top-right corner of the current page.
 * Call once per doc right after creation; didDrawPage will re-apply on new pages.
 */
const addLogoToDoc = (doc) => {
  try {
    const pw = doc.internal.pageSize.width;
    // Logo placed top-right: 50×50 pt (square) to preserve the circular shape
    doc.addImage(nipponLogoUrl, 'PNG', pw - 70, 5, 50, 50);
  } catch {
    // Silently skip if image fails to load (e.g. offline/test)
  }
};

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
    addLogoToDoc(doc);

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
export const exportRequestDetailsPDF = (selectedL1Details, selectedL2Details, selectedLog, activeTab = 'all', setToastMsg) => {
  let targetTab = activeTab;
  let toastFn = setToastMsg;
  if (typeof targetTab === 'function') {
    toastFn = targetTab;
    targetTab = 'all';
  }

  try {
    if (!selectedL1Details) {
      toastFn?.('Level 1 request details are not loaded.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });
    addLogoToDoc(doc);

    const primaryColor = [0, 102, 204]; // #0066cc
    const textColor = [51, 65, 85];    // Slate-700
    const lightBg = [248, 250, 252];    // Slate-50

    // Title & Header Branding
    let titleSuffix = '';
    let docFilename = `CMS_Detail_Report_${selectedL1Details.change_no}`;
    if (targetTab === 'l1') {
      titleSuffix = ' - Level 1 Details';
      docFilename = `CMS_L1_Details_${selectedL1Details.change_no}`;
    } else if (targetTab === 'l2') {
      titleSuffix = ' - Level 2 Validation';
      docFilename = `CMS_L2_Validation_${selectedL1Details.change_no}`;
    } else if (targetTab === 'l3') {
      titleSuffix = ' - Level 3 Approvals';
      docFilename = `CMS_L3_Approvals_${selectedL1Details.change_no}`;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`4M Change Request Detail Report${titleSuffix}`, 40, 45);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text(`Generated on: ${formatDateToDDMMYYYY(getSyncedDate())}`, doc.internal.pageSize.width - 230, 45);

    // Section 1: General Info
    const generalInfoData = [
      [
        { content: 'Change Number:', fontStyle: 'bold' }, selectedL1Details.change_no || '-',
        { content: 'Status:', fontStyle: 'bold' }, `L1: ${selectedL1Details.crStatus === 'Pending' ? 'Pending' : 'Completed'}`,
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
    if (targetTab === 'l1' || targetTab === 'all') {
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
    }

    // Section 3: Level 2 Validation Details
    if (targetTab === 'l2' || targetTab === 'all') {
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
    }

    // Section 4: Level 3 Approval Matrix
    if ((targetTab === 'l3' || targetTab === 'all') && selectedLog) {
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

    doc.save(`${docFilename}.pdf`);
    toastFn?.('Request details exported successfully!');
  } catch (error) {
    console.error('Error generating detailed PDF:', error);
    toastFn?.('Error generating detailed PDF export.');
  }
};

/**
 * Exports the L2 Validation Logs to a landscape A4 PDF.
 * @param {Array} filteredLogs 
 * @param {Object} filtersInfo 
 * @param {Function} setToastMsg 
 */
export const exportL2ValidationLogsPDF = (filteredLogs, filtersInfo = {}, setToastMsg) => {
  try {
    if (!filteredLogs || filteredLogs.length === 0) {
      setToastMsg?.('No data available to export.');
      return;
    }

    const { searchQuery = '', decisionFilter = 'All' } = filtersInfo;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4'
    });
    addLogoToDoc(doc);

    const headers = [['SL. NO.', 'CHANGE NO.', 'REQUEST DATE', 'REQUESTER', 'PED ATTACH.', 'QA ATTACH.', 'STATUS', 'REMARKS']];

    const tableData = filteredLogs.map((item, idx) => [
      idx + 1,
      item.changeNo,
      item.date ? formatDateToDDMMYYYY(item.date) : '-',
      item.requester,
      item.weldTest || '-',
      item.qaTest || '-',
      item.status,
      item.remarks || '-'
    ]);

    // Branding & Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 102, 204);
    doc.text('4M Change Management System - L2 Validation Logs', 40, 45);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Exported Date: ${formatDateToDDMMYYYY(getSyncedDate())}`, 40, 60);
    doc.text(`Active Filters -> Search: "${searchQuery || 'None'}", Decision: "${decisionFilter}"`, 40, 75);

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
        fontSize: 8.5,
        textColor: [51, 65, 85]
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 90, fontStyle: 'bold' },
        2: { cellWidth: 80 },
        3: { cellWidth: 100 },
        4: { cellWidth: 110 },
        5: { cellWidth: 110 },
        6: { cellWidth: 80 },
        7: { cellWidth: 150 }
      },
      margin: { top: 40, bottom: 40, left: 40, right: 40 },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, doc.internal.pageSize.width - 80, doc.internal.pageSize.height - 20);
        doc.text('NIPPON QUALITY ASSURANCE - CONFIDENTIAL L2 LOGS', 40, doc.internal.pageSize.height - 20);
      },
      didParseCell: (data) => {
        if (data.column.index === 6 && data.row.index > 0) {
          const val = data.cell.text[0];
          if (val === 'Accepted') {
            data.cell.styles.textColor = [16, 124, 65]; // Green
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'Rejected') {
            data.cell.styles.textColor = [220, 38, 38]; // Red
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'Pending') {
            data.cell.styles.textColor = [217, 119, 6]; // Amber
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    doc.save(`4M_L2_Validation_Logs_${formatDateToDDMMYYYY(getSyncedDate()).replace(/\//g, '-')}.pdf`);
    setToastMsg?.('L2 validation logs exported successfully!');
  } catch (error) {
    console.error('Error generating L2 PDF:', error);
    setToastMsg?.('Error generating L2 PDF export.');
  }
};

/**
 * Exports the L3 Approval Matrix to a landscape A4 PDF.
 * @param {Array} filteredLogs 
 * @param {Object} filtersInfo 
 * @param {Function} setToastMsg 
 */
export const exportL3ApprovalsPDF = (filteredLogs, filtersInfo = {}, setToastMsg) => {
  try {
    if (!filteredLogs || filteredLogs.length === 0) {
      setToastMsg?.('No data available to export.');
      return;
    }

    const { searchQuery = '', statusFilter = 'All' } = filtersInfo;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4'
    });
    addLogoToDoc(doc);

    // 14 columns to fit A4 landscape (842pt width)
    const headers = [['SL.', 'CHANGE NO.', 'DATE', 'REQUESTER', 'PED', 'QA', 'PROD', 'MAINT', 'PC&L', 'MAT', 'MKTG', 'HR', 'SAFE', 'UH']];

    const tableData = filteredLogs.map((item, idx) => [
      idx + 1,
      item.changeNo,
      item.date ? formatDateToDDMMYYYY(item.date) : '-',
      item.requester ? item.requester.split('@')[0] : '-',
      item.ped || 'Pending',
      item.quality || 'Pending',
      item.production || 'Pending',
      item.maintenance || 'Pending',
      item.pcl || 'Pending',
      item.materials || 'Pending',
      item.marketing || 'Pending',
      item.hr || 'Pending',
      item.safety || 'Pending',
      item.unitHead || 'Pending'
    ]);

    // Branding & Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 102, 204);
    doc.text('4M Change Management System - L3 Approval Tracker Matrix', 40, 45);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Exported Date: ${formatDateToDDMMYYYY(getSyncedDate())}`, 40, 60);
    doc.text(`Active Filters -> Search: "${searchQuery || 'None'}", Status: "${statusFilter}"`, 40, 75);

    autoTable(doc, {
      startY: 90,
      head: headers,
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [0, 102, 204],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'left'
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [51, 65, 85]
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 65, fontStyle: 'bold' },
        2: { cellWidth: 60 },
        3: { cellWidth: 80 },
        4: { cellWidth: 52 }, // PED
        5: { cellWidth: 52 }, // QA
        6: { cellWidth: 52 }, // PROD
        7: { cellWidth: 52 }, // MAINT
        8: { cellWidth: 52 }, // PC&L
        9: { cellWidth: 52 }, // MAT
        10: { cellWidth: 52 }, // MKTG
        11: { cellWidth: 52 }, // HR
        12: { cellWidth: 52 }, // SAFE
        13: { cellWidth: 52 }  // UH
      },
      margin: { top: 40, bottom: 40, left: 40, right: 40 },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, doc.internal.pageSize.width - 80, doc.internal.pageSize.height - 20);
        doc.text('NIPPON QUALITY ASSURANCE - CONFIDENTIAL L3 APPROVAL MATRIX', 40, doc.internal.pageSize.height - 20);
      },
      didParseCell: (data) => {
        // Highlight status cells
        if (data.column.index >= 4 && data.column.index <= 13 && data.row.index > 0) {
          const val = data.cell.text[0];
          if (val === 'Accepted' || val === 'Approved') {
            data.cell.styles.textColor = [16, 124, 65]; // Green
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'Rejected') {
            data.cell.styles.textColor = [220, 38, 38]; // Red
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'Pending') {
            data.cell.styles.textColor = [217, 119, 6]; // Amber
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    doc.save(`4M_L3_Approval_Matrix_${formatDateToDDMMYYYY(getSyncedDate()).replace(/\//g, '-')}.pdf`);
    setToastMsg?.('L3 matrix approvals exported successfully!');
  } catch (error) {
    console.error('Error generating L3 PDF:', error);
    setToastMsg?.('Error generating L3 PDF export.');
  }
};

/**
 * Exports the Approvals list to a landscape A4 PDF.
 * @param {Array} filteredApprovals 
 * @param {Object} filtersInfo 
 * @param {Function} setToastMsg 
 */
export const exportApprovalsListPDF = (filteredApprovals, filtersInfo = {}, setToastMsg) => {
  try {
    if (!filteredApprovals || filteredApprovals.length === 0) {
      setToastMsg?.('No data available to export.');
      return;
    }

    const {
      searchQuery = '',
      statusFilter = 'All',
      actingDept = ''
    } = filtersInfo;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4'
    });
    addLogoToDoc(doc);

    const headers = [['SL. NO.', 'CHANGE NO.', 'DATE', 'REQUESTED BY', 'DEPARTMENT', 'HOD STATUS', 'REMARKS']];

    const tableData = filteredApprovals.map((item, idx) => [
      idx + 1,
      item.changeNo,
      item.date || '-',
      item.requestBy || item.requesterEmail || '-',
      item.dept || '-',
      item.hodStatus || 'Pending',
      item.hodRemarks || '-'
    ]);

    // Title & Branding (Blue theme)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 102, 204); // #0066cc
    doc.text('4M Change Management System - HOD Approvals Log', 40, 45);

    // Metadata details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Exported Date: ${formatDateToDDMMYYYY(getSyncedDate())}`, 40, 60);

    const filterParts = [];
    if (searchQuery) filterParts.push(`Search: "${searchQuery}"`);
    if (statusFilter !== 'All') filterParts.push(`Status: "${statusFilter}"`);
    if (actingDept) filterParts.push(`Department: "${actingDept}"`);

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
        2: { cellWidth: 80 },  // DATE
        3: { cellWidth: 140 }, // REQUESTED BY
        4: { cellWidth: 100 }, // DEPARTMENT
        5: { cellWidth: 90 },  // HOD STATUS
        6: { cellWidth: 210 }  // REMARKS
      },
      margin: { top: 40, bottom: 40, left: 40, right: 40 },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // Slate-400
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, doc.internal.pageSize.width - 80, doc.internal.pageSize.height - 20);
        doc.text('NIPPON QUALITY ASSURANCE - CONFIDENTIAL APPROVAL LOGS', 40, doc.internal.pageSize.height - 20);
      },
      didParseCell: (data) => {
        if (data.column.index === 5 && data.row.index > 0) {
          const val = data.cell.text[0];
          if (val === 'Approved') {
            data.cell.styles.textColor = [16, 124, 65]; // Green
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'Rejected') {
            data.cell.styles.textColor = [220, 38, 38]; // Red
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'Pending') {
            data.cell.styles.textColor = [217, 119, 6]; // Amber
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    doc.save(`4M_HOD_Approvals_${formatDateToDDMMYYYY(getSyncedDate()).replace(/\//g, '-')}.pdf`);
    setToastMsg?.('PDF exported successfully!');
  } catch (error) {
    console.error('Error generating PDF:', error);
    setToastMsg?.('Error generating PDF export.');
  }
};

/**
 * Exports the Users list to a landscape A4 PDF.
 * @param {Array} filteredUsers 
 * @param {Object} filtersInfo 
 * @param {Function} setToastMsg 
 */
export const exportUsersListPDF = (filteredUsers, filtersInfo = {}, setToastMsg) => {
  try {
    if (!filteredUsers || filteredUsers.length === 0) {
      setToastMsg?.('No data available to export.');
      return;
    }

    const {
      searchQuery = '',
      roleFilter = 'All'
    } = filtersInfo;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4'
    });
    addLogoToDoc(doc);

    const headers = [['SL. NO.', 'USER ID', 'NAME', 'EMAIL', 'ROLE', 'DEPARTMENT', 'STATUS']];

    const tableData = filteredUsers.map((item, idx) => [
      idx + 1,
      `USR-${String(item.id).padStart(3, '0')}`,
      item.name || 'Unnamed User',
      item.email || '-',
      item.role || '-',
      item.department || '-',
      item.status || 'Active'
    ]);

    // Title & Branding (Blue theme)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 102, 204); // #0066cc
    doc.text('4M Change Management System - User Directory', 40, 45);

    // Metadata details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Exported Date: ${formatDateToDDMMYYYY(getSyncedDate())}`, 40, 60);

    const filterParts = [];
    if (searchQuery) filterParts.push(`Search: "${searchQuery}"`);
    if (roleFilter !== 'All') filterParts.push(`Role: "${roleFilter}"`);

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
        1: { cellWidth: 80, fontStyle: 'bold' },  // USER ID
        2: { cellWidth: 130 }, // NAME
        3: { cellWidth: 180 }, // EMAIL
        4: { cellWidth: 100 }, // ROLE
        5: { cellWidth: 120 }, // DEPARTMENT
        6: { cellWidth: 100 }  // STATUS
      },
      margin: { top: 40, bottom: 40, left: 40, right: 40 },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // Slate-400
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, doc.internal.pageSize.width - 80, doc.internal.pageSize.height - 20);
        doc.text('NIPPON QUALITY ASSURANCE - CONFIDENTIAL USER DIRECTORY', 40, doc.internal.pageSize.height - 20);
      },
      didParseCell: (data) => {
        if (data.column.index === 6 && data.row.index > 0) {
          const val = data.cell.text[0];
          if (val === 'Active') {
            data.cell.styles.textColor = [16, 124, 65]; // Green
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'Inactive') {
            data.cell.styles.textColor = [220, 38, 38]; // Red
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    doc.save(`4M_User_Directory_${formatDateToDDMMYYYY(getSyncedDate()).replace(/\//g, '-')}.pdf`);
    setToastMsg?.('PDF exported successfully!');
  } catch (error) {
    console.error('Error generating PDF:', error);
    setToastMsg?.('Error generating PDF export.');
  }
};

/**
 * Exports the Dashboard's filtered change requests to a landscape A4 PDF.
 * @param {Array} filteredChanges 
 * @param {Object} filtersInfo 
 * @param {Function} setToastMsg 
 */
export const exportDashboardRequestsPDF = (filteredChanges, filtersInfo = {}, setToastMsg) => {
  try {
    if (!filteredChanges || filteredChanges.length === 0) {
      setToastMsg?.('No data available to export.');
      return;
    }

    const {
      month = 'All',
      fromDate = '',
      toDate = '',
      person = 'All',
      process = 'All',
      machine = 'All',
      status = 'All'
    } = filtersInfo;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4'
    });
    addLogoToDoc(doc);

    const headers = [['SL. NO.', 'CHANGE NO.', 'MACHINE NO.', 'DEPARTMENT', 'REQUEST DATE', 'STATUS']];

    const tableData = filteredChanges.map((item, idx) => {
      const displayStatus = getRequestDisplayStatus(item);

      return [
        idx + 1,
        item.id,
        item.machineNo || '-',
        item.dept || item.department || 'PRODUCTION',
        item.date ? formatDateToDDMMYYYY(item.date) : '-',
        displayStatus
      ];
    });

    // Title & Branding (Blue theme)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 102, 204); // #0066cc
    doc.text('4M Change Management System - Dashboard Overview Log', 40, 45);

    // Metadata details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Exported Date: ${formatDateToDDMMYYYY(getSyncedDate())}`, 40, 60);

    const filterParts = [];
    if (month !== 'All') filterParts.push(`Month: "${month}"`);
    if (fromDate) filterParts.push(`From: "${fromDate}"`);
    if (toDate) filterParts.push(`To: "${toDate}"`);
    if (person !== 'All') filterParts.push(`Person: "${person.split('@')[0]}"`);
    if (process !== 'All') filterParts.push(`Process: "${process}"`);
    if (machine !== 'All') filterParts.push(`Machine: "${machine}"`);
    if (status !== 'All') filterParts.push(`Status: "${status}"`);

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
        0: { cellWidth: 60 },  // SL. NO.
        1: { cellWidth: 130, fontStyle: 'bold' },  // CHANGE NO.
        2: { cellWidth: 120 }, // MACHINE NO.
        3: { cellWidth: 160 }, // DEPARTMENT
        4: { cellWidth: 140 }, // REQUEST DATE
        5: { cellWidth: 150 }  // STATUS
      },
      margin: { top: 40, bottom: 40, left: 40, right: 40 },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // Slate-400
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, doc.internal.pageSize.width - 80, doc.internal.pageSize.height - 20);
        doc.text('NIPPON QUALITY ASSURANCE - CONFIDENTIAL DASHBOARD OVERVIEW LOGS', 40, doc.internal.pageSize.height - 20);
      },
      didParseCell: (data) => {
        if (data.column.index === 5 && data.row.index > 0) {
          const val = data.cell.text[0];
          if (val === 'Approved') {
            data.cell.styles.textColor = [16, 124, 65]; // Green
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'Rejected') {
            data.cell.styles.textColor = [220, 38, 38]; // Red
            data.cell.styles.fontStyle = 'bold';
          } else if (val && val.includes('Pending')) {
            data.cell.styles.textColor = [217, 119, 6]; // Amber
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'Closed') {
            data.cell.styles.textColor = [100, 116, 139]; // Slate-500
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    doc.save(`4M_Dashboard_Requests_${formatDateToDDMMYYYY(getSyncedDate()).replace(/\//g, '-')}.pdf`);
    setToastMsg?.('PDF exported successfully!');
  } catch (error) {
    console.error('Error generating PDF:', error);
    setToastMsg?.('Error generating PDF export.');
  }
};

/**
 * Exports the Effectiveness Monitoring Logs to a landscape A4 PDF.
 * @param {Array} filteredLogs 
 * @param {Object} filtersInfo 
 * @param {Function} setToastMsg 
 */
export const exportEffectivenessLogsPDF = (filteredLogs, filtersInfo = {}, setToastMsg) => {
  try {
    if (!filteredLogs || filteredLogs.length === 0) {
      setToastMsg?.('No data available to export.');
      return;
    }

    const { searchQuery = '', statusFilter = 'All', monthFilter = 'All' } = filtersInfo;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4'
    });
    addLogoToDoc(doc);

    const headers = [['SL. NO.', 'CHANGE NO.', 'REQ. DATE', 'CONTEXT', 'START DATE', 'MONTH', 'EFFECTIVENESS STATUS', 'QA DECISION', 'REMARKS']];

    const tableData = filteredLogs.map((item, idx) => {
      // Month-Wise mapping function
      const formatMonthWise = (val) => {
        if (!val) return "-";
        if (val.includes('/')) {
          const parts = val.split('/');
          if (parts.length === 3) {
            const month = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            const date = new Date(year, month - 1, 1);
            if (!isNaN(date.getTime())) {
              const monthName = date.toLocaleDateString("en-US", { month: "short" });
              const yearShort = String(year).slice(-2);
              return `${monthName}-${yearShort}`;
            }
          }
        }
        if (val.includes('-')) {
          const parts = val.split("-");
          if (parts.length === 2) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const date = new Date(year, month - 1, 1);
            if (!isNaN(date.getTime())) {
              const monthName = date.toLocaleDateString("en-US", { month: "short" });
              const yearShort = String(year).slice(-2);
              return `${monthName}-${yearShort}`;
            }
          }
        }
        return val;
      };

      return [
        idx + 1,
        item.changeNo,
        item.reqDate ? formatDateToDDMMYYYY(item.reqDate) : '-',
        item.context || '-',
        item.startDate ? formatDateToDDMMYYYY(item.startDate) : '-',
        item.monthWise ? formatMonthWise(item.monthWise) : '-',
        item.status || '-',
        item.qaApproval || '-',
        item.remarks || '-'
      ];
    });

    // Title & Branding (Blue theme)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 102, 204); // #0066cc
    doc.text('4M Change Management System - Effectiveness Monitoring Logs', 40, 45);

    // Metadata details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Exported Date: ${formatDateToDDMMYYYY(getSyncedDate())}`, 40, 60);

    const filterParts = [];
    if (searchQuery) filterParts.push(`Search: "${searchQuery}"`);
    if (statusFilter !== 'All') filterParts.push(`Status: "${statusFilter}"`);
    if (monthFilter !== 'All') filterParts.push(`Month: "${monthFilter}"`);

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
        fontSize: 8.5,
        textColor: [51, 65, 85] // Slate-700
      },
      columnStyles: {
        0: { cellWidth: 40 },  // SL. NO.
        1: { cellWidth: 80, fontStyle: 'bold' },  // CHANGE NO.
        2: { cellWidth: 70 },  // REQ. DATE
        3: { cellWidth: 120 }, // CONTEXT
        4: { cellWidth: 70 },  // START DATE
        5: { cellWidth: 70 },  // MONTH
        6: { cellWidth: 120 }, // EFFECTIVENESS STATUS
        7: { cellWidth: 80 },  // QA DECISION
        8: { cellWidth: 110 }  // REMARKS
      },
      margin: { top: 40, bottom: 40, left: 40, right: 40 },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // Slate-400
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, doc.internal.pageSize.width - 80, doc.internal.pageSize.height - 20);
        doc.text('NIPPON QUALITY ASSURANCE - CONFIDENTIAL EFFECTIVENESS OBSERVATIONS', 40, doc.internal.pageSize.height - 20);
      },
      didParseCell: (data) => {
        // Highlight Status
        if (data.column.index === 6 && data.row.index > 0) {
          const val = data.cell.text[0];
          if (val === 'Effectiveness Ok') {
            data.cell.styles.textColor = [16, 124, 65]; // Green
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'Effectiveness Not Ok') {
            data.cell.styles.textColor = [220, 38, 38]; // Red
            data.cell.styles.fontStyle = 'bold';
          }
        }
        // Highlight QA Approval Decision
        if (data.column.index === 7 && data.row.index > 0) {
          const val = data.cell.text[0];
          if (val === 'Approved') {
            data.cell.styles.textColor = [16, 124, 65]; // Green
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'Rejected') {
            data.cell.styles.textColor = [220, 38, 38]; // Red
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    doc.save(`4M_Effectiveness_Logs_${formatDateToDDMMYYYY(getSyncedDate()).replace(/\//g, '-')}.pdf`);
    setToastMsg?.('PDF exported successfully!');
  } catch (error) {
    console.error('Error generating PDF:', error);
    setToastMsg?.('Error generating PDF export.');
  }
};

/**
 * Formats a summary of current filters.
 */
const getFilterSummaryText = (filtersInfo) => {
  const {
    month = 'All',
    fromDate = '',
    toDate = '',
    person = 'All',
    process = 'All',
    machine = 'All',
    status = 'All'
  } = filtersInfo;

  const filterParts = [];
  if (month !== 'All') filterParts.push(`Month: "${month}"`);
  if (fromDate) filterParts.push(`From: "${fromDate}"`);
  if (toDate) filterParts.push(`To: "${toDate}"`);
  if (person !== 'All') filterParts.push(`Person: "${person.split('@')[0]}"`);
  if (process !== 'All') filterParts.push(`Process: "${process}"`);
  if (machine !== 'All') filterParts.push(`Machine: "${machine}"`);
  if (status !== 'All') filterParts.push(`Status: "${status}"`);

  return filterParts.length > 0 
    ? `Active Filters -> ${filterParts.join(', ')}`
    : 'Active Filters -> None';
};

/**
 * Export Department Analytics
 */
export const exportDepartmentAnalyticsPDF = (filteredChanges, filtersInfo = {}, setToastMsg) => {
  try {
    if (!filteredChanges || filteredChanges.length === 0) {
      setToastMsg?.('No data available to export.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });
    addLogoToDoc(doc);

    // Calculate counts
    const counts = {
      'PED': 0, 'QAD': 0, 'PRODUCTION': 0, 'MAINTENANCE': 0, 'PC & L': 0,
      'MATERIALS': 0, 'MARKETING': 0, 'HR': 0, 'SAFETY': 0
    };

    filteredChanges.forEach(c => {
      const rawDept = (c.dept || c.department || '').trim().toUpperCase();
      let mapped;
      if (rawDept.includes('PED')) mapped = 'PED';
      else if (rawDept.includes('QA') || rawDept.includes('QUALITY')) mapped = 'QAD';
      else if (rawDept.includes('PROD')) mapped = 'PRODUCTION';
      else if (rawDept.includes('MAINT')) mapped = 'MAINTENANCE';
      else if (rawDept.includes('PC')) mapped = 'PC & L';
      else if (rawDept.includes('MATER')) mapped = 'MATERIALS';
      else if (rawDept.includes('MARKET')) mapped = 'MARKETING';
      else if (rawDept.includes('HR')) mapped = 'HR';
      else if (rawDept.includes('SAFE')) mapped = 'SAFETY';
      else mapped = 'PRODUCTION';

      if (counts[mapped] !== undefined) counts[mapped]++;
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    const summaryHeaders = [['DEPARTMENT', 'NO. OF CHANGE REQUESTS', 'PERCENTAGE']];
    const summaryRows = Object.keys(counts).map(dept => {
      const count = counts[dept];
      const pct = total > 0 ? ((count / total) * 100).toFixed(1) + '%' : '0.0%';
      return [dept, count, pct];
    });
    summaryRows.push([
      { content: 'TOTAL', fontStyle: 'bold' },
      { content: total, fontStyle: 'bold' },
      { content: '100%', fontStyle: 'bold' }
    ]);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0, 102, 204);
    doc.text('4M Change Management - Department Analytics', 40, 45);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Exported Date: ${formatDateToDDMMYYYY(getSyncedDate())}`, 40, 60);

    const filterText = getFilterSummaryText(filtersInfo);
    doc.text(filterText, 40, 72);

    // Summary table
    autoTable(doc, {
      startY: 85,
      head: summaryHeaders,
      body: summaryRows,
      theme: 'grid',
      headStyles: { fillColor: [0, 102, 204], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [51, 65, 85] },
      columnStyles: {
        0: { cellWidth: 220 },
        1: { cellWidth: 160, halign: 'center' },
        2: { cellWidth: 135, halign: 'center' }
      },
      margin: { left: 40, right: 40 }
    });

    // Detail header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    doc.text('Detailed Change Requests by Department', 40, doc.lastAutoTable.finalY + 25);

    const detailedHeaders = [['SL. NO.', 'CHANGE NO.', 'DEPARTMENT', 'MACHINE NO.', 'DATE', 'STATUS']];
    const detailedRows = filteredChanges.map((c, idx) => {
      const displayDate = c.date ? formatDateToDDMMYYYY(c.date) : '-';
      const displayStatus = getRequestDisplayStatus(c);

      return [
        idx + 1,
        c.id,
        c.dept || c.department || 'PRODUCTION',
        c.machineNo || '-',
        displayDate,
        displayStatus
      ];
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 35,
      head: detailedHeaders,
      body: detailedRows,
      theme: 'striped',
      headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [51, 65, 85] },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 100, fontStyle: 'bold' },
        2: { cellWidth: 110 },
        3: { cellWidth: 90 },
        4: { cellWidth: 80 },
        5: { cellWidth: 85 }
      },
      margin: { left: 40, right: 40, bottom: 40 },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, doc.internal.pageSize.width - 80, doc.internal.pageSize.height - 20);
        doc.text('NIPPON QUALITY ASSURANCE - CONFIDENTIAL', 40, doc.internal.pageSize.height - 20);
      }
    });

    doc.save(`4M_Department_Analytics_${formatDateToDDMMYYYY(getSyncedDate()).replace(/\//g, '-')}.pdf`);
    setToastMsg?.('PDF exported successfully!');
  } catch (error) {
    console.error('Error generating PDF:', error);
    setToastMsg?.('Error exporting Department Analytics.');
  }
};

/**
 * Export Process Analytics
 */
export const exportProcessAnalyticsPDF = (filteredChanges, filtersInfo = {}, setToastMsg) => {
  try {
    if (!filteredChanges || filteredChanges.length === 0) {
      setToastMsg?.('No data available to export.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });
    addLogoToDoc(doc);

    // Calculate process counts
    const counts = { 'Wind': 0, 'Gold': 0, 'EOL': 0, 'Pott': 0, 'Load': 0 };

    filteredChanges.forEach(c => {
      const p = (c.processName || '').trim().toLowerCase();
      let mapped;
      if (p.includes('wind') || p.includes('weld')) mapped = 'Wind';
      else if (p.includes('gold') || p.includes('calib')) mapped = 'Gold';
      else if (p.includes('eol') || p.includes('mold') || p.includes('mould') || p.includes('inject')) mapped = 'EOL';
      else if (p.includes('pott') || p.includes('train')) mapped = 'Pott';
      else if (p.includes('load') || p.includes('gauge')) mapped = 'Load';
      else mapped = 'Wind';

      counts[mapped]++;
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    const summaryHeaders = [['PROCESS', 'NO. OF CHANGE REQUESTS', 'PERCENTAGE']];
    const summaryRows = Object.keys(counts).map(proc => {
      const count = counts[proc];
      const pct = total > 0 ? ((count / total) * 100).toFixed(1) + '%' : '0.0%';
      return [proc, count, pct];
    });
    summaryRows.push([
      { content: 'TOTAL', fontStyle: 'bold' },
      { content: total, fontStyle: 'bold' },
      { content: '100%', fontStyle: 'bold' }
    ]);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0, 102, 204);
    doc.text('4M Change Management - Process Analytics', 40, 45);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Exported Date: ${formatDateToDDMMYYYY(getSyncedDate())}`, 40, 60);

    const filterText = getFilterSummaryText(filtersInfo);
    doc.text(filterText, 40, 72);

    // Summary table
    autoTable(doc, {
      startY: 85,
      head: summaryHeaders,
      body: summaryRows,
      theme: 'grid',
      headStyles: { fillColor: [0, 102, 204], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [51, 65, 85] },
      columnStyles: {
        0: { cellWidth: 220 },
        1: { cellWidth: 160, halign: 'center' },
        2: { cellWidth: 135, halign: 'center' }
      },
      margin: { left: 40, right: 40 }
    });

    // Detail header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    doc.text('Detailed Change Requests by Process', 40, doc.lastAutoTable.finalY + 25);

    const detailedHeaders = [['SL. NO.', 'CHANGE NO.', 'PROCESS NAME', 'MACHINE NO.', 'DATE', 'STATUS']];
    const detailedRows = filteredChanges.map((c, idx) => {
      const displayDate = c.date ? formatDateToDDMMYYYY(c.date) : '-';
      const displayStatus = getRequestDisplayStatus(c);

      return [
        idx + 1,
        c.id,
        c.processName || '-',
        c.machineNo || '-',
        displayDate,
        displayStatus
      ];
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 35,
      head: detailedHeaders,
      body: detailedRows,
      theme: 'striped',
      headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [51, 65, 85] },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 100, fontStyle: 'bold' },
        2: { cellWidth: 110 },
        3: { cellWidth: 90 },
        4: { cellWidth: 80 },
        5: { cellWidth: 85 }
      },
      margin: { left: 40, right: 40, bottom: 40 },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, doc.internal.pageSize.width - 80, doc.internal.pageSize.height - 20);
        doc.text('NIPPON QUALITY ASSURANCE - CONFIDENTIAL', 40, doc.internal.pageSize.height - 20);
      }
    });

    doc.save(`4M_Process_Analytics_${formatDateToDDMMYYYY(getSyncedDate()).replace(/\//g, '-')}.pdf`);
    setToastMsg?.('PDF exported successfully!');
  } catch (error) {
    console.error('Error generating PDF:', error);
    setToastMsg?.('Error exporting Process Analytics.');
  }
};

/**
 * Export 6M Category Analytics
 */
export const exportCategoryAnalyticsPDF = (filteredChanges, filtersInfo = {}, setToastMsg) => {
  try {
    if (!filteredChanges || filteredChanges.length === 0) {
      setToastMsg?.('No data available to export.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });
    addLogoToDoc(doc);

    // Calculate category counts
    const counts = { 'Man': 0, 'Mac': 0, 'Met': 0, 'Mat': 0, 'Mea': 0, 'Mot': 0 };

    filteredChanges.forEach(c => {
      const catStr = (c.changeIn || c.title || c.id || '').trim().toLowerCase();
      let mapped;
      if (catStr.includes('man') || catStr.includes('train')) mapped = 'Man';
      else if (catStr.includes('mac') || catStr.includes('machin') || catStr.includes('weld')) mapped = 'Mac';
      else if (catStr.includes('met') || catStr.includes('calib') || catStr.includes('sso') || catStr.includes('db') || catStr.includes('api') || catStr.includes('vulner')) mapped = 'Met';
      else if (catStr.includes('mat') || catStr.includes('spec') || catStr.includes('cool')) mapped = 'Mat';
      else if (catStr.includes('mea') || catStr.includes('gauge') || catStr.includes('check') || catStr.includes('repeat')) mapped = 'Mea';
      else if (catStr.includes('mot') || catStr.includes('nature') || catStr.includes('env')) mapped = 'Mot';
      else mapped = 'Met';

      counts[mapped]++;
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    const summaryHeaders = [['6M CATEGORY', 'NO. OF CHANGE REQUESTS', 'PERCENTAGE']];
    const summaryRows = Object.keys(counts).map(cat => {
      const count = counts[cat];
      const pct = total > 0 ? ((count / total) * 100).toFixed(1) + '%' : '0.0%';
      return [cat, count, pct];
    });
    summaryRows.push([
      { content: 'TOTAL', fontStyle: 'bold' },
      { content: total, fontStyle: 'bold' },
      { content: '100%', fontStyle: 'bold' }
    ]);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0, 102, 204);
    doc.text('4M Change Management - 6M Category Analytics', 40, 45);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Exported Date: ${formatDateToDDMMYYYY(getSyncedDate())}`, 40, 60);

    const filterText = getFilterSummaryText(filtersInfo);
    doc.text(filterText, 40, 72);

    // Summary table
    autoTable(doc, {
      startY: 85,
      head: summaryHeaders,
      body: summaryRows,
      theme: 'grid',
      headStyles: { fillColor: [0, 102, 204], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [51, 65, 85] },
      columnStyles: {
        0: { cellWidth: 220 },
        1: { cellWidth: 160, halign: 'center' },
        2: { cellWidth: 135, halign: 'center' }
      },
      margin: { left: 40, right: 40 }
    });

    // Detail header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    doc.text('Detailed Change Requests by 6M Category', 40, doc.lastAutoTable.finalY + 25);

    const detailedHeaders = [['SL. NO.', 'CHANGE NO.', 'CHANGE IN / TITLE', 'MACHINE NO.', 'DATE', 'STATUS']];
    const detailedRows = filteredChanges.map((c, idx) => {
      const displayDate = c.date ? formatDateToDDMMYYYY(c.date) : '-';
      const displayStatus = getRequestDisplayStatus(c);

      return [
        idx + 1,
        c.id,
        c.changeIn || c.title || '-',
        c.machineNo || '-',
        displayDate,
        displayStatus
      ];
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 35,
      head: detailedHeaders,
      body: detailedRows,
      theme: 'striped',
      headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [51, 65, 85] },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 90, fontStyle: 'bold' },
        2: { cellWidth: 155 },
        3: { cellWidth: 80 },
        4: { cellWidth: 75 },
        5: { cellWidth: 75 }
      },
      margin: { left: 40, right: 40, bottom: 40 },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, doc.internal.pageSize.width - 80, doc.internal.pageSize.height - 20);
        doc.text('NIPPON QUALITY ASSURANCE - CONFIDENTIAL', 40, doc.internal.pageSize.height - 20);
      }
    });

    doc.save(`4M_6M_Category_Analytics_${formatDateToDDMMYYYY(getSyncedDate()).replace(/\//g, '-')}.pdf`);
    setToastMsg?.('PDF exported successfully!');
  } catch (error) {
    console.error('Error generating PDF:', error);
    setToastMsg?.('Error exporting 6M Category Analytics.');
  }
};

/**
 * Export Monthly Analytics
 */
export const exportMonthlyAnalyticsPDF = (filteredChanges, filtersInfo = {}, setToastMsg) => {
  try {
    if (!filteredChanges || filteredChanges.length === 0) {
      setToastMsg?.('No data available to export.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });
    addLogoToDoc(doc);

    // Calculate monthly counts
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const counts = Array(12).fill(0);

    filteredChanges.forEach(c => {
      if (!c.date) return;
      try {
        const d = new Date(c.date);
        if (!isNaN(d.getTime())) {
          counts[d.getMonth()]++;
        }
      } catch {
        // Ignore date parsing errors
      }
    });

    const total = counts.reduce((a, b) => a + b, 0);

    const summaryHeaders = [['MONTH', 'NO. OF CHANGE REQUESTS', 'PERCENTAGE']];
    const summaryRows = months.map((m, idx) => {
      const count = counts[idx];
      const pct = total > 0 ? ((count / total) * 100).toFixed(1) + '%' : '0.0%';
      return [m, count, pct];
    });
    summaryRows.push([
      { content: 'TOTAL', fontStyle: 'bold' },
      { content: total, fontStyle: 'bold' },
      { content: '100%', fontStyle: 'bold' }
    ]);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0, 102, 204);
    doc.text('4M Change Management - Monthly Analytics', 40, 45);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Exported Date: ${formatDateToDDMMYYYY(getSyncedDate())}`, 40, 60);

    const filterText = getFilterSummaryText(filtersInfo);
    doc.text(filterText, 40, 72);

    // Summary table
    autoTable(doc, {
      startY: 85,
      head: summaryHeaders,
      body: summaryRows,
      theme: 'grid',
      headStyles: { fillColor: [0, 102, 204], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [51, 65, 85] },
      columnStyles: {
        0: { cellWidth: 220 },
        1: { cellWidth: 160, halign: 'center' },
        2: { cellWidth: 135, halign: 'center' }
      },
      margin: { left: 40, right: 40 }
    });

    // Detail header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    doc.text('Detailed Change Requests List', 40, doc.lastAutoTable.finalY + 25);

    const detailedHeaders = [['SL. NO.', 'CHANGE NO.', 'DEPARTMENT', 'MACHINE NO.', 'DATE', 'STATUS']];
    const detailedRows = filteredChanges.map((c, idx) => {
      const displayDate = c.date ? formatDateToDDMMYYYY(c.date) : '-';
      const displayStatus = getRequestDisplayStatus(c);

      return [
        idx + 1,
        c.id,
        c.dept || c.department || 'PRODUCTION',
        c.machineNo || '-',
        displayDate,
        displayStatus
      ];
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 35,
      head: detailedHeaders,
      body: detailedRows,
      theme: 'striped',
      headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [51, 65, 85] },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 100, fontStyle: 'bold' },
        2: { cellWidth: 110 },
        3: { cellWidth: 90 },
        4: { cellWidth: 80 },
        5: { cellWidth: 85 }
      },
      margin: { left: 40, right: 40, bottom: 40 },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, doc.internal.pageSize.width - 80, doc.internal.pageSize.height - 20);
        doc.text('NIPPON QUALITY ASSURANCE - CONFIDENTIAL', 40, doc.internal.pageSize.height - 20);
      }
    });

    doc.save(`4M_Monthly_Analytics_${formatDateToDDMMYYYY(getSyncedDate()).replace(/\//g, '-')}.pdf`);
    setToastMsg?.('PDF exported successfully!');
  } catch (error) {
    console.error('Error generating PDF:', error);
    setToastMsg?.('Error exporting Monthly Analytics.');
  }
};

/**
 * Export Approval Status Analytics
 */
export const exportApprovalStatusAnalyticsPDF = (filteredChanges, filtersInfo = {}, setToastMsg) => {
  try {
    if (!filteredChanges || filteredChanges.length === 0) {
      setToastMsg?.('No data available to export.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });
    addLogoToDoc(doc);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dataMap = months.map(m => ({ label: m, appr: 0, closed: 0, rej: 0, pend: 0 }));

    filteredChanges.forEach(c => {
      if (!c.date) return;
      try {
        const d = new Date(c.date);
        if (!isNaN(d.getTime())) {
          const monthIdx = d.getMonth();
          const dispStatus = getRequestDisplayStatus(c);
          if (dispStatus === 'Approved') {
            dataMap[monthIdx].appr++;
          } else if (dispStatus === 'Closed') {
            dataMap[monthIdx].closed++;
          } else if (dispStatus === 'Rejected') {
            dataMap[monthIdx].rej++;
          } else {
            dataMap[monthIdx].pend++;
          }
        }
      } catch {
        // Ignore date parsing errors
      }
    });

    const summaryHeaders = [['MONTH', 'APPROVED', 'CLOSED', 'REJECTED', 'PENDING', 'TOTAL']];
    const summaryRows = dataMap.map(item => {
      const monthTotal = item.appr + item.closed + item.rej + item.pend;
      return [item.label, item.appr, item.closed, item.rej, item.pend, monthTotal];
    });

    const totalAppr = dataMap.reduce((a, b) => a + b.appr, 0);
    const totalClosed = dataMap.reduce((a, b) => a + b.closed, 0);
    const totalRej = dataMap.reduce((a, b) => a + b.rej, 0);
    const totalPend = dataMap.reduce((a, b) => a + b.pend, 0);
    const totalAll = totalAppr + totalClosed + totalRej + totalPend;

    summaryRows.push([
      { content: 'TOTAL', fontStyle: 'bold' },
      { content: totalAppr, fontStyle: 'bold' },
      { content: totalClosed, fontStyle: 'bold' },
      { content: totalRej, fontStyle: 'bold' },
      { content: totalPend, fontStyle: 'bold' },
      { content: totalAll, fontStyle: 'bold' }
    ]);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0, 102, 204);
    doc.text('4M Change Management - Approval Status Analytics', 40, 45);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Exported Date: ${formatDateToDDMMYYYY(getSyncedDate())}`, 40, 60);

    const filterText = getFilterSummaryText(filtersInfo);
    doc.text(filterText, 40, 72);

    // Summary table
    autoTable(doc, {
      startY: 85,
      head: summaryHeaders,
      body: summaryRows,
      theme: 'grid',
      headStyles: { fillColor: [0, 102, 204], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [51, 65, 85] },
      columnStyles: {
        0: { cellWidth: 115 },
        1: { cellWidth: 80, halign: 'center' },
        2: { cellWidth: 80, halign: 'center' },
        3: { cellWidth: 80, halign: 'center' },
        4: { cellWidth: 80, halign: 'center' },
        5: { cellWidth: 80, halign: 'center' }
      },
      margin: { left: 40, right: 40 }
    });

    // Detail header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    doc.text('Detailed Change Requests List with Status', 40, doc.lastAutoTable.finalY + 25);

    const detailedHeaders = [['SL. NO.', 'CHANGE NO.', 'DEPARTMENT', 'MACHINE NO.', 'DATE', 'STATUS']];
    const detailedRows = filteredChanges.map((c, idx) => {
      const displayDate = c.date ? formatDateToDDMMYYYY(c.date) : '-';
      const displayStatus = getRequestDisplayStatus(c);

      return [
        idx + 1,
        c.id,
        c.dept || c.department || 'PRODUCTION',
        c.machineNo || '-',
        displayDate,
        displayStatus
      ];
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 35,
      head: detailedHeaders,
      body: detailedRows,
      theme: 'striped',
      headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [51, 65, 85] },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 100, fontStyle: 'bold' },
        2: { cellWidth: 110 },
        3: { cellWidth: 90 },
        4: { cellWidth: 80 },
        5: { cellWidth: 85 }
      },
      margin: { left: 40, right: 40, bottom: 40 },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, doc.internal.pageSize.width - 80, doc.internal.pageSize.height - 20);
        doc.text('NIPPON QUALITY ASSURANCE - CONFIDENTIAL', 40, doc.internal.pageSize.height - 20);
      }
    });

    doc.save(`4M_Approval_Status_Analytics_${formatDateToDDMMYYYY(getSyncedDate()).replace(/\//g, '-')}.pdf`);
    setToastMsg?.('PDF exported successfully!');
  } catch (error) {
    console.error('Error generating PDF:', error);
    setToastMsg?.('Error exporting Approval Status Analytics.');
  }
};

/**
 * Export Improvement Benefits Analytics
 */
export const exportImprovementBenefitsPDF = (costSavingRows, productivityRows, qualityRows, filtersInfo = {}, setToastMsg) => {
  try {
    const {
      type = 'All',
      month = 'All',
      search = ''
    } = filtersInfo;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });
    addLogoToDoc(doc);

    // Title & Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0, 102, 204);
    doc.text('4M Change Management - Improvement Benefits Report', 40, 45);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Exported Date: ${formatDateToDDMMYYYY(getSyncedDate())}`, 40, 60);

    const filterParts = [];
    if (type !== 'All') filterParts.push(`Type: "${type}"`);
    if (month !== 'All') filterParts.push(`Month: "${month}"`);
    if (search) filterParts.push(`Search: "${search}"`);
    const filterText = filterParts.length > 0
      ? `Active Filters -> ${filterParts.join(', ')}`
      : 'Active Filters -> None';
    doc.text(filterText, 40, 72);

    let startY = 90;

    const showCost = type === 'All' || type === 'Cost';
    const showProductivity = type === 'All' || type === 'Productivity';
    const showQuality = type === 'All' || type === 'Quality';

    if (showCost) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 96, 170); // #1e60aa
      doc.text('1. Cost Saving Benefits', 40, startY);

      const costHeaders = [['4M CHANGE NO.', 'IMPLEMENTATION DATE', 'TOTAL COST SAVED / MONTH (RS)', 'TOTAL COST SAVED / ANNUM (RS)', 'ROI']];
      const costTableData = costSavingRows.map(row => [
        row.changeNo,
        row.date || '-',
        `Rs. ${row.monthlySave || '0'}`,
        `Rs. ${row.annualSave || '0'}`,
        row.roi || '-'
      ]);

      autoTable(doc, {
        startY: startY + 10,
        head: costHeaders,
        body: costTableData.length > 0 ? costTableData : [['-', '-', '-', '-', '-']],
        theme: 'grid',
        headStyles: { fillColor: [30, 96, 170], textColor: [255, 255, 255] },
        bodyStyles: { textColor: [51, 65, 85], fontSize: 8.5 },
        margin: { left: 40, right: 40 }
      });

      startY = doc.lastAutoTable.finalY + 25;
    }

    if (showProductivity) {
      if (startY > doc.internal.pageSize.height - 150) {
        doc.addPage();
        addLogoToDoc(doc);
        startY = 50;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 96, 170);
      doc.text(showCost ? '2. Productivity Improvement Benefits' : '1. Productivity Improvement Benefits', 40, startY);

      const prodHeaders = [['4M CHANGE NO.', 'IMPLEMENTATION DATE', 'CURRENT PRODUCTIVITY (NOS)', 'PRODUCTIVITY IMPROVED (NOS)']];
      const prodTableData = productivityRows.map(row => [
        row.changeNo,
        row.date || '-',
        `${row.currentProd || '0'} nos`,
        `${row.improvedProd || '0'} nos`
      ]);

      autoTable(doc, {
        startY: startY + 10,
        head: prodHeaders,
        body: prodTableData.length > 0 ? prodTableData : [['-', '-', '-', '-']],
        theme: 'grid',
        headStyles: { fillColor: [30, 96, 170], textColor: [255, 255, 255] },
        bodyStyles: { textColor: [51, 65, 85], fontSize: 8.5 },
        margin: { left: 40, right: 40 }
      });

      startY = doc.lastAutoTable.finalY + 25;
    }

    if (showQuality) {
      if (startY > doc.internal.pageSize.height - 150) {
        doc.addPage();
        addLogoToDoc(doc);
        startY = 50;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 96, 170);
      let secNum = 1;
      if (showCost && showProductivity) secNum = 3;
      else if (showCost || showProductivity) secNum = 2;
      doc.text(`${secNum}. Quality Improvement Benefits`, 40, startY);

      const qualityHeaders = [['4M CHANGE NO.', 'IMPLEMENTATION DATE', 'CURRENT PPM', 'REDUCED PPM']];
      const qualityTableData = qualityRows.map(row => [
        row.changeNo,
        row.date || '-',
        row.currentPpm || '0',
        row.reducedPpm || '0'
      ]);

      autoTable(doc, {
        startY: startY + 10,
        head: qualityHeaders,
        body: qualityTableData.length > 0 ? qualityTableData : [['-', '-', '-', '-']],
        theme: 'grid',
        headStyles: { fillColor: [30, 96, 170], textColor: [255, 255, 255] },
        bodyStyles: { textColor: [51, 65, 85], fontSize: 8.5 },
        margin: { left: 40, right: 40 }
      });
    }

    // Add Footer to all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 80, doc.internal.pageSize.height - 20);
      doc.text('NIPPON QUALITY ASSURANCE - CONFIDENTIAL', 40, doc.internal.pageSize.height - 20);
    }

    doc.save(`4M_Improvement_Benefits_${formatDateToDDMMYYYY(getSyncedDate()).replace(/\//g, '-')}.pdf`);
    setToastMsg?.('PDF exported successfully!');
  } catch (error) {
    console.error('Error generating PDF:', error);
    setToastMsg?.('Error exporting Improvement Benefits.');
  }
};




