import test from "node:test";
import assert from "node:assert/strict";
import { decideFollowUp } from "./dispatch.ts";

test("an opted-out technician is suppressed before an SMS request is built", () => {
  const decision = decideFollowUp({
    workOrderId: "WO-1042",
    technicianPhone: "+15550101111",
    customerName: "Mina",
    dispatchStatus: "completed",
    photoCount: 3,
    optedOut: true,
  });
  assert.deepEqual(decision, { action: "suppress", workOrderId: "WO-1042", reason: "recipient_opted_out" });
});

test("an allowed follow-up includes dispatch state and photo count", () => {
  const decision = decideFollowUp({
    workOrderId: "WO-1043",
    technicianPhone: "+15550102222",
    customerName: "Ravi",
    dispatchStatus: "en_route",
    photoCount: 2,
    optedOut: false,
  });
  assert.equal(decision.action, "send");
  if (decision.action !== "send") throw new Error("expected a send decision");
  assert.match(decision.message, /WO-1043.*2 photo\(s\).*en_route/);
});
