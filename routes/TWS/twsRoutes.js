import express from "express";

const router = express.Router();

const twsStore = new Map();

function newId() {
  return "TWS-" + Math.random().toString(16).slice(2, 8).toUpperCase();
}

function computeTotals(loads = []) {
  let totalUnits = 0;
  let totalHours = 0;

  for (const r of loads) {
    const units = Number(r.units || 0);
    const lec = Number(r.lec || 0);
    const lab = Number(r.lab || 0);
    const sec = Number(r.sections || 1);

    totalUnits += units;
    totalHours += (lec + lab) * sec;
  }

  return { totalUnits, totalHours };
}

function getOr404(req, res) {
  const id = req.params.id;
  const tws = twsStore.get(id);
  if (!tws) {
    res.status(404).send("TWS not found");
    return null;
  }
  return tws;
}

// ==========================
// Dashboard / Listing
// ==========================
router.get("/dashboard", (req, res) => {
  const list = Array.from(twsStore.values()).sort((a, b) => b.createdAt - a.createdAt);
  res.render("TWS/twsCreatePage", { list });
});

// ==========================
// Create Draft
// ==========================
router.get("/create", (req, res) => {
  const id = newId();

  const draft = {
    id,
    createdAt: Date.now(),
    status: "Draft",
    faculty: {
      name: "",
      empId: "",
      dept: "",
      acadYear: "",
      term: "",
      immediateHead: "",
    },
    loads: [],
    totals: { totalUnits: 0, totalHours: 0 },
    approval: { status: "Not Submitted", remarks: "" },
    archived: false,
  };

  twsStore.set(id, draft);
  res.redirect(`/twa/faculty/${id}`);
});

// ==========================
// Faculty Info
// ==========================
router.get("/faculty/:id", (req, res) => {
  const tws = getOr404(req, res);
  if (!tws) return;

  res.render("TWS/twsFacultyInfo", { tws });
});

router.post("/faculty/:id", (req, res) => {
  const tws = getOr404(req, res);
  if (!tws) return;

  const { name, empId, dept, acadYear, term, immediateHead, action } = req.body;

  tws.faculty = {
    name: name || "",
    empId: empId || "",
    dept: dept || "",
    acadYear: acadYear || "",
    term: term || "",
    immediateHead: immediateHead || "",
  };

  if (action === "next") {
    return res.redirect(`/twa/teaching-load/${tws.id}`);
  }
  return res.redirect(`/twa/dashboard`);
});

// ==========================
// Teaching Load
// ==========================
router.get("/teaching-load/:id", (req, res) => {
  const tws = getOr404(req, res);
  if (!tws) return;

  res.render("TWS/twsTeachingLoad", { tws });
});

router.post("/teaching-load/:id", (req, res) => {
  const tws = getOr404(req, res);
  if (!tws) return;

  const { action } = req.body;

  // Ensure loads array exists
  if (!Array.isArray(tws.loads)) tws.loads = [];

  // Update existing rows from form
  // The form usually sends arrays; normalize safely
  const courseCode = req.body.courseCode || [];
  const section = req.body.section || [];
  const lec = req.body.lec || [];
  const lab = req.body.lab || [];
  const units = req.body.units || [];
  const timeDay = req.body.timeDay || [];
  const room = req.body.room || [];
  const sections = req.body.sections || [];

  const maxLen = Math.max(
    courseCode.length || 0,
    section.length || 0,
    lec.length || 0,
    lab.length || 0,
    units.length || 0
  );

  const newLoads = [];
  for (let i = 0; i < maxLen; i++) {
    newLoads.push({
      courseCode: courseCode[i] || "",
      section: section[i] || "",
      lec: lec[i] || "",
      lab: lab[i] || "",
      units: units[i] || "",
      timeDay: timeDay[i] || "",
      room: room[i] || "",
      sections: sections[i] || "1",
    });
  }
  tws.loads = newLoads;

  if (action === "addRow") {
    tws.loads.push({
      courseCode: "",
      section: "",
      lec: "",
      lab: "",
      units: "",
      timeDay: "",
      room: "",
      sections: "1",
    });
    return res.redirect(`/twa/teaching-load/${tws.id}`);
  }

  if (action === "removeRow") {
    tws.loads.pop();
    return res.redirect(`/twa/teaching-load/${tws.id}`);
  }

  // Recompute totals
  tws.totals = computeTotals(tws.loads);

  if (action === "back") {
    return res.redirect(`/twa/faculty/${tws.id}`);
  }
  if (action === "next") {
    return res.redirect(`/twa/summary/${tws.id}`);
  }

  return res.redirect(`/twa/teaching-load/${tws.id}`);
});

// ==========================
// Summary
// ==========================
router.get("/summary/:id", (req, res) => {
  const tws = getOr404(req, res);
  if (!tws) return;

  // Ensure totals are up-to-date
  tws.totals = computeTotals(tws.loads);

  res.render("TWS/twsSummary", { tws });
});

router.post("/summary/:id", (req, res) => {
  const tws = getOr404(req, res);
  if (!tws) return;

  const { action } = req.body;

  if (action === "edit") {
    return res.redirect(`/twa/teaching-load/${tws.id}`);
  }

  if (action === "submit") {
    tws.status = "Submitted";
    tws.approval.status = "Pending";
    return res.redirect(`/twa/status/${tws.id}`);
  }

  return res.redirect(`/twa/summary/${tws.id}`);
});

// ==========================
// Submission Status
// ==========================
router.get("/status/:id", (req, res) => {
  const tws = getOr404(req, res);
  if (!tws) return;

  res.render("TWS/twsSubmissionStatus", { tws });
});

// ==========================
// Approval Routing
// ==========================
router.get("/approval/:id", (req, res) => {
  const tws = getOr404(req, res);
  if (!tws) return;

  res.render("TWS/twsApprovalRouting", { tws });
});

router.post("/approval/:id", (req, res) => {
  const tws = getOr404(req, res);
  if (!tws) return;

  const { action, remarks } = req.body;

  if (action === "approve") {
    tws.approval.status = "Approved";
    tws.approval.remarks = remarks || "";
    tws.archived = true;
    return res.redirect(`/twa/archived`);
  }

  if (action === "reject") {
    tws.approval.status = "Rejected";
    tws.approval.remarks = remarks || "";
    tws.archived = true;
    return res.redirect(`/twa/archived`);
  }

  return res.redirect(`/twa/approval/${tws.id}`);
});

// ==========================
// Archived
// ==========================
router.get("/archived", (req, res) => {
  const list = Array.from(twsStore.values()).filter(x => x.archived);
  res.render("TWS/twsArchived", { list });
});

export default router;