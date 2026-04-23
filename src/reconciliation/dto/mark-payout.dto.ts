import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class MarkPayoutDto {
  @IsIn(['resolved', 'needs_review'], {
    message: 'Status must be either "resolved" or "needs_review"',
  })
  status: 'resolved' | 'needs_review';

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Note must be less than 1000 characters' })
  note?: string;
}

export class ReconciliationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

export interface OpenPayoutResponse {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  diff: number;
  created_at: Date;
  updated_at: Date;
  stripe_transfer_id: string | null;
  user_id: string;
  company_id: string | null;
}

export interface MarkPayoutResponse {
  ok: boolean;
  payout: {
    id: string;
    status: string;
    updated_at: Date;
  };
  event: {
    id: string;
    type: string;
    created_at: Date;
  };
}

export interface ReconciliationReport {
  total_open: number;
  total_amount_cents: number;
  by_status: Record<string, number>;
  diffs_found: number;
  generated_at: Date;
}
