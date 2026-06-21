const fs = require('fs');
const posPagePath = 'src/pages/owner/PosPage.jsx';
const appCheckoutPath = 'src/pages/owner/AppointmentCheckoutModal.jsx';

let posPageCode = fs.readFileSync(posPagePath, 'utf8');

// 1. Add state variables
posPageCode = posPageCode.replace(
  'payments: [emptyPayment]\n  });',
  `payments: [emptyPayment]\n  });\n\n  const [showPackageModal, setShowPackageModal] = useState(false);\n  const [packageSearchInput, setPackageSearchInput] = useState("");\n  const [selectedPackage, setSelectedPackage] = useState(null);\n  const [packageDraft, setPackageDraft] = useState({ price: "", validityDays: "", staffId: "", online: "", offline: "", remark: "" });`
);

// fallback for \r\n
posPageCode = posPageCode.replace(
  'payments: [emptyPayment]\r\n  });',
  `payments: [emptyPayment]\r\n  });\r\n\r\n  const [showPackageModal, setShowPackageModal] = useState(false);\r\n  const [packageSearchInput, setPackageSearchInput] = useState("");\r\n  const [selectedPackage, setSelectedPackage] = useState(null);\r\n  const [packageDraft, setPackageDraft] = useState({ price: "", validityDays: "", staffId: "", online: "", offline: "", remark: "" });`
);

// 2. Modify basePrice in totals
posPageCode = posPageCode.replace(
  'else if (item.itemType === "PACKAGE") basePrice = Number(packageLookup[item.packageId]?.price || 0);',
  'else if (item.itemType === "PACKAGE") basePrice = item.unitPrice !== undefined ? Number(item.unitPrice) : Number(packageLookup[item.packageId]?.price || 0);'
);
posPageCode = posPageCode.replace(
  'else if (item.itemType === "PACKAGE") basePrice = Number(packageLookup[item.packageId]?.price || 0);',
  'else if (item.itemType === "PACKAGE") basePrice = item.unitPrice !== undefined ? Number(item.unitPrice) : Number(packageLookup[item.packageId]?.price || 0);'
); // there are two instances (subtotal and itemTax)

// 3. Add handleAddPackageToCart
const handleAddCode = `
  const handleAddPackageToCart = () => {
    if (!selectedPackage && packageDraft.packageId !== 'CUSTOM') return;
    const staff = context.staffUsers.find(s => s.id === packageDraft.staffId);
    setForm(prev => {
      const activeItems = prev.items.filter(item => item.serviceId || item.productId || item.membershipPlanId || item.packageId);
      const nextItems = [...activeItems, {
        itemType: "PACKAGE",
        packageId: selectedPackage ? selectedPackage.id : "CUSTOM",
        name: selectedPackage ? selectedPackage.name : "Custom Package",
        staffUserId: packageDraft.staffId || "",
        qty: 1,
        unitPrice: Number(packageDraft.price || 0),
        taxPct: 0
      }];
      return { ...prev, items: nextItems };
    });
    const onlineAmt = Number(packageDraft.online || 0);
    const offlineAmt = Number(packageDraft.offline || 0);
    if (onlineAmt > 0 || offlineAmt > 0) {
      setForm(current => {
        let payments = [...current.payments];
        if (onlineAmt > 0) {
          const online = payments.find(p => p.mode === "ONLINE");
          if (online) online.amount = Number(online.amount) + onlineAmt;
          else payments.push({ mode: "ONLINE", amount: onlineAmt, note: "" });
        }
        if (offlineAmt > 0) {
          const offline = payments.find(p => p.mode === "CASH");
          if (offline) offline.amount = Number(offline.amount) + offlineAmt;
          else payments.push({ mode: "CASH", amount: offlineAmt, note: "" });
        }
        return { ...current, payments };
      });
    }
    setShowPackageModal(false);
    setSelectedPackage(null);
    setPackageDraft({ price: "", validityDays: "", staffId: "", online: "", offline: "", remark: "" });
  };
`;
posPageCode = posPageCode.replace('  return (\n    <div className="pos-layout">', handleAddCode + '\n  return (\n    <div className="pos-layout">');
posPageCode = posPageCode.replace('  return (\r\n    <div className="pos-layout">', handleAddCode + '\r\n  return (\r\n    <div className="pos-layout">');

// 4. Modify Add Package button
posPageCode = posPageCode.replace(
  '<button className={`pos-top-tab ${tab === "packages" ? "active" : ""}`} onClick={() => setTab("packages")}>Add Package</button>',
  '<button className={`pos-top-tab`} onClick={() => setShowPackageModal(true)}>Add Package</button>'
);

// 5. Inject Modal HTML
const checkoutCode = fs.readFileSync(appCheckoutPath, 'utf8');
const modalStart = checkoutCode.indexOf('{showPackageModal && (');
let modalEnd = checkoutCode.indexOf('{showServiceModal && (');
if (modalEnd === -1) modalEnd = checkoutCode.indexOf('</div>\n  );\n}');
if (modalEnd === -1) modalEnd = checkoutCode.indexOf('</div>\r\n  );\r\n}');
let modalContent = checkoutCode.substring(modalStart, modalEnd).trim();
modalContent = modalContent.replace(/posContext/g, 'context');

let posPageEnd = posPageCode.lastIndexOf('</div>\n  );');
if (posPageEnd === -1) posPageEnd = posPageCode.lastIndexOf('</div>\r\n  );');

posPageCode = posPageCode.substring(0, posPageEnd) + '\\n      ' + modalContent + '\\n    </div>\\n  );\\n}';

fs.writeFileSync(posPagePath, posPageCode);
