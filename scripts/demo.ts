import { dispatchFollowUp } from "../src/dispatch.ts";

const key = process.env.INFRAI_API_KEY;
const phone = process.env.TECHNICIAN_PHONE;
if (!key || !phone) throw new Error("Set INFRAI_API_KEY and TECHNICIAN_PHONE");

const result = await dispatchFollowUp({
  workOrderId: process.env.WORK_ORDER_ID ?? "WO-1042",
  technicianPhone: phone,
  customerName: process.env.CUSTOMER_NAME ?? "Mina",
  dispatchStatus: "completed",
  photoCount: 3,
  optedOut: process.env.TECHNICIAN_SMS_OPTOUT === "true",
}, key);
console.log(JSON.stringify(result, null, 2));
