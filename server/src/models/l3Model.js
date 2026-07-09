import pool from '../config/db.js';
import { broadcast } from '../config/websocket.js';
import { 
  createL3DecisionNotifications, 
  sendL3DecisionEmails, 
  createL3CompletionNotifications, 
  sendL3CompletionEmails,
  createL3RejectionNotifications,
  sendL3RejectionEmails
} from './l3NotificationModel.js';

export const ensureL3ApprovalsColumns = async () => {
  try {
    const [columns] = await pool.query(`SHOW COLUMNS FROM l3_approvals`);
    const columnNames = columns.map(col => col.Field.toLowerCase());
    
    const depts = ['ped', 'qad', 'production', 'maintenance', 'pcl', 'materials', 'marketing', 'hr', 'safety', 'unit_head'];
    for (const dept of depts) {
      const colName = dept === 'unit_head' ? 'unit_head_approved_by' : `${dept}_approved_by`;
      if (!columnNames.includes(colName.toLowerCase())) {
        console.log(`Adding column ${colName} to l3_approvals table`);
        await pool.query(`ALTER TABLE l3_approvals ADD COLUMN ${colName} VARCHAR(255) NULL`);
      }
    }
  } catch (error) {
    console.error('Error ensuring L3 Approvals columns:', error);
  }
};

// Run table column verification immediately
ensureL3ApprovalsColumns().catch(err => {
  console.error("Error initializing L3 approvals table columns:", err);
});

export const getL3Approvals = async () => {
  const [rows] = await pool.query(
    `SELECT c.id as changeNo, 
            c.status as status,
            DATE_FORMAT(c.date, '%e %b') as date, 
            COALESCE(NULLIF(u.name, ''), l1.request_by, c.requester) as requester,
            COALESCE(NULLIF(u.department, ''), l1.dept) as raisedDept,
            v.status as l2Decision,
            v.remarks as l2Remarks,
            COALESCE(l.ped, 'Pending') as ped,
            COALESCE(l.ped_remarks, '') as pedRemarks,
            l.ped_approved_by as pedApprovedBy,
            COALESCE(l.qad, 'Pending') as qad,
            COALESCE(l.qad_remarks, '') as qadRemarks,
            l.qad_approved_by as qadApprovedBy,
            COALESCE(l.production, 'Pending') as production,
            COALESCE(l.production_remarks, '') as productionRemarks,
            l.production_approved_by as productionApprovedBy,
            COALESCE(l.maintenance, 'Pending') as maintenance,
            COALESCE(l.maintenance_remarks, '') as maintenanceRemarks,
            l.maintenance_approved_by as maintenanceApprovedBy,
            COALESCE(l.pcl, 'Pending') as pcl,
            COALESCE(l.pcl_remarks, '') as pclRemarks,
            l.pcl_approved_by as pclApprovedBy,
            COALESCE(l.materials, 'Pending') as materials,
            COALESCE(l.materials_remarks, '') as materialsRemarks,
            l.materials_approved_by as materialsApprovedBy,
            COALESCE(l.marketing, 'Pending') as marketing,
            COALESCE(l.marketing_remarks, '') as marketingRemarks,
            l.marketing_approved_by as marketingApprovedBy,
            COALESCE(l.hr, 'Pending') as hr,
            COALESCE(l.hr_remarks, '') as hrRemarks,
            l.hr_approved_by as hrApprovedBy,
            COALESCE(l.safety, 'Pending') as safety,
            COALESCE(l.safety_remarks, '') as safetyRemarks,
            l.safety_approved_by as safetyApprovedBy,
            COALESCE(l.unit_head, 'Pending') as unitHead,
            COALESCE(l.unit_head_remarks, '') as unitHeadRemarks,
            l.unit_head_approved_by as unitHeadApprovedBy,
            e.qa_approval as qaApproval
     FROM change_requests c
     LEFT JOIN l1_requests l1 ON c.id = l1.change_no
     LEFT JOIN users u ON c.requester = u.email
     INNER JOIN l2_validation_logs v ON c.id = v.change_no AND v.status = 'Accepted'
     LEFT JOIN l3_approvals l ON c.id = l.change_no
     LEFT JOIN effectiveness_logs e ON c.id = e.change_no
     WHERE e.id IS NULL
     ORDER BY c.created_at DESC, CAST(SUBSTRING_INDEX(c.id, '-', -1) AS UNSIGNED) DESC`
  );
  return rows;
};

export const getL3DetailsByChangeNo = async (changeNo) => {
  const [rows] = await pool.query(
    `SELECT change_no as changeNo, 
            ped, ped_remarks as pedRemarks, ped_approved_by as pedApprovedBy,
            qad, qad_remarks as qadRemarks, qad_approved_by as qadApprovedBy,
            production, production_remarks as productionRemarks, production_approved_by as productionApprovedBy,
            maintenance, maintenance_remarks as maintenanceRemarks, maintenance_approved_by as maintenanceApprovedBy,
            pcl, pcl_remarks as pclRemarks, pcl_approved_by as pclApprovedBy,
            materials, materials_remarks as materialsRemarks, materials_approved_by as materialsApprovedBy,
            marketing, marketing_remarks as marketingRemarks, marketing_approved_by as marketingApprovedBy,
            hr, hr_remarks as hrRemarks, hr_approved_by as hrApprovedBy,
            safety, safety_remarks as safetyRemarks, safety_approved_by as safetyApprovedBy,
            unit_head as unitHead, unit_head_remarks as unitHeadRemarks, unit_head_approved_by as unitHeadApprovedBy,
            date, requester
     FROM l3_approvals
     WHERE change_no = ?`,
    [changeNo]
  );
  return rows[0] || null;
};

export const addL3ApprovalLog = async (logData) => {
  const {
    changeNo, date, requester,
    ped, pedRemarks, pedApprovedBy,
    qad, qadRemarks, qadApprovedBy,
    production, productionRemarks, productionApprovedBy,
    maintenance, maintenanceRemarks, maintenanceApprovedBy,
    pcl, pclRemarks, pclApprovedBy,
    materials, materialsRemarks, materialsApprovedBy,
    marketing, marketingRemarks, marketingApprovedBy,
    hr, hrRemarks, hrApprovedBy,
    safety, safetyRemarks, safetyApprovedBy,
    unitHead, unitHeadRemarks, unitHeadApprovedBy
  } = logData;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existing] = await connection.query(
      `SELECT id FROM change_requests WHERE id = ?`,
      [changeNo]
    );

    if (existing.length === 0) {
      const [adminRows] = await connection.query("SELECT email FROM users WHERE role = 'Admin'");
      if (adminRows.length === 0) {
        throw new Error("No admin user found in database");
      }
      const adminEmail = adminRows[0].email;
      await connection.query(
        `INSERT INTO change_requests (id, title, requester, date, priority, status) 
         VALUES (?, ?, ?, CURDATE(), 'Medium', 'Pending')`,
        [changeNo, `[L3 Auto] Approval for ${changeNo}`, adminEmail]
      );
    }

    // Fetch existing L3 approval before update to detect HOD decision changes
    const [existingL3Rows] = await connection.query(
      `SELECT ped, ped_remarks as pedRemarks, ped_approved_by as pedApprovedBy,
              qad, qad_remarks as qadRemarks, qad_approved_by as qadApprovedBy,
              production, production_remarks as productionRemarks, production_approved_by as productionApprovedBy,
              maintenance, maintenance_remarks as maintenanceRemarks, maintenance_approved_by as maintenanceApprovedBy,
              pcl, pcl_remarks as pclRemarks, pcl_approved_by as pclApprovedBy,
              materials, materials_remarks as materialsRemarks, materials_approved_by as materialsApprovedBy,
              marketing, marketing_remarks as marketingRemarks, marketing_approved_by as marketingApprovedBy,
              hr, hr_remarks as hrRemarks, hr_approved_by as hrApprovedBy,
              safety, safety_remarks as safetyRemarks, safety_approved_by as safetyApprovedBy,
              unit_head as unitHead, unit_head_remarks as unitHeadRemarks, unit_head_approved_by as unitHeadApprovedBy
       FROM l3_approvals WHERE change_no = ?`,
      [changeNo]
    );

    let wasAlreadyAllL3Decided = false;
    if (existingL3Rows.length > 0) {
      const dbL3 = existingL3Rows[0];
      wasAlreadyAllL3Decided = 
        dbL3.ped && dbL3.ped !== 'Pending' &&
        dbL3.qad && dbL3.qad !== 'Pending' &&
        dbL3.production && dbL3.production !== 'Pending' &&
        dbL3.maintenance && dbL3.maintenance !== 'Pending' &&
        dbL3.pcl && dbL3.pcl !== 'Pending' &&
        dbL3.materials && dbL3.materials !== 'Pending' &&
        dbL3.marketing && dbL3.marketing !== 'Pending' &&
        dbL3.hr && dbL3.hr !== 'Pending' &&
        dbL3.safety && dbL3.safety !== 'Pending' &&
        dbL3.unitHead && dbL3.unitHead !== 'Pending';
    }

    let finalPed = ped;
    let finalPedRemarks = pedRemarks;
    let finalPedApprovedBy = pedApprovedBy;
    let finalQad = qad;
    let finalQadRemarks = qadRemarks;
    let finalQadApprovedBy = qadApprovedBy;
    let finalProduction = production;
    let finalProductionRemarks = productionRemarks;
    let finalProductionApprovedBy = productionApprovedBy;
    let finalMaintenance = maintenance;
    let finalMaintenanceRemarks = maintenanceRemarks;
    let finalMaintenanceApprovedBy = maintenanceApprovedBy;
    let finalPcl = pcl;
    let finalPclRemarks = pclRemarks;
    let finalPclApprovedBy = pclApprovedBy;
    let finalMaterials = materials;
    let finalMaterialsRemarks = materialsRemarks;
    let finalMaterialsApprovedBy = materialsApprovedBy;
    let finalMarketing = marketing;
    let finalMarketingRemarks = marketingRemarks;
    let finalMarketingApprovedBy = marketingApprovedBy;
    let finalHr = hr;
    let finalHrRemarks = hrRemarks;
    let finalHrApprovedBy = hrApprovedBy;
    let finalSafety = safety;
    let finalSafetyRemarks = safetyRemarks;
    let finalSafetyApprovedBy = safetyApprovedBy;
    let finalUnitHead = unitHead;
    let finalUnitHeadRemarks = unitHeadRemarks;
    let finalUnitHeadApprovedBy = unitHeadApprovedBy;

    if (existingL3Rows.length > 0) {
      const dbL3 = existingL3Rows[0];
      if ((ped === 'Pending' || !ped) && dbL3.ped && dbL3.ped !== 'Pending') {
        finalPed = dbL3.ped;
        finalPedRemarks = dbL3.pedRemarks;
        finalPedApprovedBy = dbL3.pedApprovedBy;
      }
      if ((qad === 'Pending' || !qad) && dbL3.qad && dbL3.qad !== 'Pending') {
        finalQad = dbL3.qad;
        finalQadRemarks = dbL3.qadRemarks;
        finalQadApprovedBy = dbL3.qadApprovedBy;
      }
      if ((production === 'Pending' || !production) && dbL3.production && dbL3.production !== 'Pending') {
        finalProduction = dbL3.production;
        finalProductionRemarks = dbL3.productionRemarks;
        finalProductionApprovedBy = dbL3.productionApprovedBy;
      }
      if ((maintenance === 'Pending' || !maintenance) && dbL3.maintenance && dbL3.maintenance !== 'Pending') {
        finalMaintenance = dbL3.maintenance;
        finalMaintenanceRemarks = dbL3.maintenanceRemarks;
        finalMaintenanceApprovedBy = dbL3.maintenanceApprovedBy;
      }
      if ((pcl === 'Pending' || !pcl) && dbL3.pcl && dbL3.pcl !== 'Pending') {
        finalPcl = dbL3.pcl;
        finalPclRemarks = dbL3.pclRemarks;
        finalPclApprovedBy = dbL3.pclApprovedBy;
      }
      if ((materials === 'Pending' || !materials) && dbL3.materials && dbL3.materials !== 'Pending') {
        finalMaterials = dbL3.materials;
        finalMaterialsRemarks = dbL3.materialsRemarks;
        finalMaterialsApprovedBy = dbL3.materialsApprovedBy;
      }
      if ((marketing === 'Pending' || !marketing) && dbL3.marketing && dbL3.marketing !== 'Pending') {
        finalMarketing = dbL3.marketing;
        finalMarketingRemarks = dbL3.marketingRemarks;
        finalMarketingApprovedBy = dbL3.marketingApprovedBy;
      }
      if ((hr === 'Pending' || !hr) && dbL3.hr && dbL3.hr !== 'Pending') {
        finalHr = dbL3.hr;
        finalHrRemarks = dbL3.hrRemarks;
        finalHrApprovedBy = dbL3.hrApprovedBy;
      }
      if ((safety === 'Pending' || !safety) && dbL3.safety && dbL3.safety !== 'Pending') {
        finalSafety = dbL3.safety;
        finalSafetyRemarks = dbL3.safetyRemarks;
        finalSafetyApprovedBy = dbL3.safetyApprovedBy;
      }
      if ((unitHead === 'Pending' || !unitHead) && dbL3.unitHead && dbL3.unitHead !== 'Pending') {
        finalUnitHead = dbL3.unitHead;
        finalUnitHeadRemarks = dbL3.unitHeadRemarks;
        finalUnitHeadApprovedBy = dbL3.unitHeadApprovedBy;
      }
    }

    await connection.query(
      `INSERT INTO l3_approvals (
        change_no, date, requester, 
        ped, ped_remarks, ped_approved_by,
        qad, qad_remarks, qad_approved_by,
        production, production_remarks, production_approved_by,
        maintenance, maintenance_remarks, maintenance_approved_by,
        pcl, pcl_remarks, pcl_approved_by,
        materials, materials_remarks, materials_approved_by,
        marketing, marketing_remarks, marketing_approved_by,
        hr, hr_remarks, hr_approved_by,
        safety, safety_remarks, safety_approved_by,
        unit_head, unit_head_remarks, unit_head_approved_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        date = VALUES(date),
        requester = VALUES(requester),
        ped = VALUES(ped),
        ped_remarks = VALUES(ped_remarks),
        ped_approved_by = VALUES(ped_approved_by),
        qad = VALUES(qad),
        qad_remarks = VALUES(qad_remarks),
        qad_approved_by = VALUES(qad_approved_by),
        production = VALUES(production),
        production_remarks = VALUES(production_remarks),
        production_approved_by = VALUES(production_approved_by),
        maintenance = VALUES(maintenance),
        maintenance_remarks = VALUES(maintenance_remarks),
        maintenance_approved_by = VALUES(maintenance_approved_by),
        pcl = VALUES(pcl),
        pcl_remarks = VALUES(pcl_remarks),
        pcl_approved_by = VALUES(pcl_approved_by),
        materials = VALUES(materials),
        materials_remarks = VALUES(materials_remarks),
        materials_approved_by = VALUES(materials_approved_by),
        marketing = VALUES(marketing),
        marketing_remarks = VALUES(marketing_remarks),
        marketing_approved_by = VALUES(marketing_approved_by),
        hr = VALUES(hr),
        hr_remarks = VALUES(hr_remarks),
        hr_approved_by = VALUES(hr_approved_by),
        safety = VALUES(safety),
        safety_remarks = VALUES(safety_remarks),
        safety_approved_by = VALUES(safety_approved_by),
        unit_head = VALUES(unit_head),
        unit_head_remarks = VALUES(unit_head_remarks),
        unit_head_approved_by = VALUES(unit_head_approved_by)`,
      [
        changeNo, date, requester,
        finalPed || 'Pending', finalPedRemarks || '', finalPedApprovedBy || null,
        finalQad || 'Pending', finalQadRemarks || '', finalQadApprovedBy || null,
        finalProduction || 'Pending', finalProductionRemarks || '', finalProductionApprovedBy || null,
        finalMaintenance || 'Pending', finalMaintenanceRemarks || '', finalMaintenanceApprovedBy || null,
        finalPcl || 'Pending', finalPclRemarks || '', finalPclApprovedBy || null,
        finalMaterials || 'Pending', finalMaterialsRemarks || '', finalMaterialsApprovedBy || null,
        finalMarketing || 'Pending', finalMarketingRemarks || '', finalMarketingApprovedBy || null,
        finalHr || 'Pending', finalHrRemarks || '', finalHrApprovedBy || null,
        finalSafety || 'Pending', finalSafetyRemarks || '', finalSafetyApprovedBy || null,
        finalUnitHead || 'Pending', finalUnitHeadRemarks || '', finalUnitHeadApprovedBy || null
      ]
    );

    // Fetch raisedDept, requesterEmail, title, date, date_start
    const [crRows] = await connection.query(
      `SELECT COALESCE(l1.dept, u.department) as raisedDept, c.requester as requesterEmail, c.title, 
              DATE_FORMAT(c.date, '%Y-%m-%d') as date, DATE_FORMAT(l1.date_start, '%Y-%m-%d') as dateStart
       FROM change_requests c
       LEFT JOIN l1_requests l1 ON c.id = l1.change_no
       LEFT JOIN users u ON c.requester = u.email
       WHERE c.id = ?`,
      [changeNo]
    );
    const raisedDept = crRows.length > 0 ? crRows[0].raisedDept : '';
    const requesterEmail = crRows.length > 0 ? crRows[0].requesterEmail : '';
    const title = crRows.length > 0 ? crRows[0].title : '';
    const dbDate = crRows.length > 0 ? crRows[0].date : new Date().toISOString().slice(0, 10);
    const dateStart = crRows.length > 0 && crRows[0].dateStart ? crRows[0].dateStart : dbDate;



    const isAllL3Decided = 
      finalPed !== 'Pending' &&
      finalQad !== 'Pending' &&
      finalProduction !== 'Pending' &&
      finalMaintenance !== 'Pending' &&
      finalPcl !== 'Pending' &&
      finalMaterials !== 'Pending' &&
      finalMarketing !== 'Pending' &&
      finalHr !== 'Pending' &&
      finalSafety !== 'Pending' &&
      finalUnitHead !== 'Pending';

    // Calculate if any of the decisions is 'Rejected'
    const rejectedDepts = [];
    const labelMap = {
      ped: 'PED',
      qad: 'QAD',
      production: 'Production',
      maintenance: 'Maintenance',
      pcl: 'PC & L',
      materials: 'Materials',
      marketing: 'Marketing',
      hr: 'HR',
      safety: 'Safety',
      unitHead: 'Unit Head'
    };
    if (finalPed === 'Rejected') rejectedDepts.push(labelMap.ped);
    if (finalQad === 'Rejected') rejectedDepts.push(labelMap.qad);
    if (finalProduction === 'Rejected') rejectedDepts.push(labelMap.production);
    if (finalMaintenance === 'Rejected') rejectedDepts.push(labelMap.maintenance);
    if (finalPcl === 'Rejected') rejectedDepts.push(labelMap.pcl);
    if (finalMaterials === 'Rejected') rejectedDepts.push(labelMap.materials);
    if (finalMarketing === 'Rejected') rejectedDepts.push(labelMap.marketing);
    if (finalHr === 'Rejected') rejectedDepts.push(labelMap.hr);
    if (finalSafety === 'Rejected') rejectedDepts.push(labelMap.safety);
    if (finalUnitHead === 'Rejected') rejectedDepts.push(labelMap.unitHead);

    const hasRejection = rejectedDepts.length > 0;

    const isAllL3Approved = 
      (finalPed === 'Approved' || finalPed === 'Acknowledge') &&
      (finalQad === 'Approved' || finalQad === 'Acknowledge') &&
      (finalProduction === 'Approved' || finalProduction === 'Acknowledge') &&
      (finalMaintenance === 'Approved' || finalMaintenance === 'Acknowledge') &&
      (finalPcl === 'Approved' || finalPcl === 'Acknowledge') &&
      (finalMaterials === 'Approved' || finalMaterials === 'Acknowledge') &&
      (finalMarketing === 'Approved' || finalMarketing === 'Acknowledge') &&
      (finalHr === 'Approved' || finalHr === 'Acknowledge') &&
      (finalSafety === 'Approved' || finalSafety === 'Acknowledge') &&
      (finalUnitHead === 'Approved' || finalUnitHead === 'Acknowledge');

    if (isAllL3Decided) {
      await connection.query(
        `UPDATE change_requests SET status = 'Completed' WHERE id = ?`,
        [changeNo]
      );

      if (isAllL3Approved) {
        const [existingEff] = await connection.query(
          `SELECT id FROM effectiveness_logs WHERE change_no = ?`,
          [changeNo]
        );
        if (existingEff.length === 0) {
          const effId = `EFF-${Date.now().toString().substring(7)}`;
          await connection.query(
            `INSERT INTO effectiveness_logs (id, change_no, req_date, context, start_date, month_wise, remarks, attachment, status, qa_approval)
             VALUES (?, ?, ?, ?, ?, '', '', '', 'Pending', 'Pending')`,
            [effId, changeNo, dbDate, title, dateStart]
          );
        }
      } else {
        await connection.query(
          `DELETE FROM effectiveness_logs WHERE change_no = ?`,
          [changeNo]
        );
      }

      if (!wasAlreadyAllL3Decided) {
        const [l1Rows] = await connection.query(
          `SELECT dept, change_in, request_by FROM l1_requests WHERE change_no = ?`,
          [changeNo]
        );
        const l1Dept = l1Rows.length > 0 ? l1Rows[0].dept : '';
        const changeIn = l1Rows.length > 0 ? l1Rows[0].change_in : '';
        const requestBy = l1Rows.length > 0 ? l1Rows[0].request_by : requester;

        if (hasRejection) {
          await createL3RejectionNotifications(
            connection, changeNo, changeIn, requestBy, requesterEmail, l1Dept, rejectedDepts
          );
        } else {
          await createL3CompletionNotifications(
            connection, changeNo, changeIn, requestBy, requesterEmail, l1Dept
          );
        }
      }
    } else {
      const [crRow] = await connection.query(
        `SELECT status FROM change_requests WHERE id = ?`,
        [changeNo]
      );
      if (crRow.length > 0 && crRow[0].status === 'Completed') {
        await connection.query(
          `UPDATE change_requests SET status = 'Approved' WHERE id = ?`,
          [changeNo]
        );
      }
    }

    await connection.commit();
    broadcast({ type: 'REFRESH_CHANGES' });
    broadcast({ type: 'REFRESH_NOTIFICATIONS' });

    if (isAllL3Decided && !wasAlreadyAllL3Decided) {
      if (hasRejection) {
        sendL3RejectionEmails(changeNo, requesterEmail, rejectedDepts).catch(err =>
          console.error('Error sending L3 rejection emails:', err)
        );
      } else {
        sendL3CompletionEmails(changeNo, requesterEmail).catch(err =>
          console.error('Error sending L3 completion emails:', err)
        );
      }
    }

    return logData;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
