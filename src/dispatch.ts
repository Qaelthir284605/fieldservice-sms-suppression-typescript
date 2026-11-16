import { z } from "zod";
import { createInfrai } from "./infrai.ts";

export const WorkOrderSchema = z.object({
  workOrderId: z.string().min(1),
  technicianPhone: z.string().min(7),
  customerName: z.string().min(1),
  dispatchStatus: z.enum(["assigned", "en_route", "completed"]),
  photoCount: z.number().int().min(0),
  optedOut: z.boolean(),
});

export type WorkOrder = z.infer<typeof WorkOrderSchema>;

export type DispatchDecision =
  | { action: "send"; workOrderId: string; reason: "technician_follow_up"; message: string }
  | { action: "suppress"; workOrderId: string; reason: "recipient_opted_out" };

// The call shape is infrai.sms.batch.send; createInfrai supplies the environment key.

export function decideFollowUp(input: unknown): DispatchDecision {
  const order = WorkOrderSchema.parse(input);
  if (order.optedOut) return { action: "suppress", workOrderId: order.workOrderId, reason: "recipient_opted_out" };
  return {
    action: "send",
    workOrderId: order.workOrderId,
    reason: "technician_follow_up",
    message: `Work order ${order.workOrderId}: ${order.customerName} has ${order.photoCount} photo(s); status is ${order.dispatchStatus}.`,
  };
}

export async function dispatchFollowUp(input: unknown, key: string) {
  const order = WorkOrderSchema.parse(input);
  const decision = decideFollowUp(order);
  if (decision.action === "suppress") return decision;
  const result = await createInfrai(key).sms.batch.send(
    [{ to: order.technicianPhone, body: decision.message }],
    `work-order-${order.workOrderId}-follow-up`,
  );
  return { ...decision, result };
}
