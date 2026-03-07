import { z } from "zod";

export const productCardSchema = z.object({
  name: z.string(),
  price: z.number(),
  image: z.string().url(),
  description: z.string(),
  color: z.string().optional(),
  inStock: z.boolean(),
});

export type ProductCardProps = z.infer<typeof productCardSchema>;

export const formFieldSchema = z.object({
  label: z.string(),
  value: z.string(),
  type: z.enum(["text", "email", "phone", "select"]),
  filled: z.boolean(),
});

export const formStepSchema = z.object({
  title: z.string(),
  fields: z.array(formFieldSchema),
  step: z.number(),
  totalSteps: z.number(),
});

export type FormStepProps = z.infer<typeof formStepSchema>;

export const approvalCardSchema = z.object({
  title: z.string(),
  description: z.string(),
  amount: z.number().optional(),
  status: z.enum(["pending", "approved", "rejected"]),
  actions: z.array(z.string()),
});

export type ApprovalCardProps = z.infer<typeof approvalCardSchema>;

export const dataChartDataPointSchema = z.object({
  name: z.string(),
  value: z.number(),
});

export const dataChartSchema = z.object({
  title: z.string(),
  data: z.array(dataChartDataPointSchema),
  type: z.enum(["bar", "line", "pie"]),
});

export type DataChartProps = z.infer<typeof dataChartSchema>;

export const statusBannerSchema = z.object({
  message: z.string(),
  type: z.enum(["info", "success", "warning", "error"]),
  progress: z.number().optional(),
});

export type StatusBannerProps = z.infer<typeof statusBannerSchema>;

export interface TamboComponentConfig<S extends z.ZodTypeAny, P> {
  name: string;
  propsSchema: S;
  component: React.ComponentType<P>;
}

export type PikAuiComponent = 
  | TamboComponentConfig<typeof productCardSchema, ProductCardProps>
  | TamboComponentConfig<typeof formStepSchema, FormStepProps>
  | TamboComponentConfig<typeof approvalCardSchema, ApprovalCardProps>
  | TamboComponentConfig<typeof dataChartSchema, DataChartProps>
  | TamboComponentConfig<typeof statusBannerSchema, StatusBannerProps>;
