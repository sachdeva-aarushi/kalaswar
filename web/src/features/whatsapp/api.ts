/**
 * Typed client API functions for internal WhatsApp simulator
 *
 * Calls FastAPI backend routes at /api/v1/internal/whatsapp/*
 */

import { apiClient } from "@/lib/api/client";

export interface MediaUploadPayload {
  phone: string;
  media_url?: string;
  media_base64?: string;
  media_id?: string;
  caption?: string;
  whatsapp_message_id?: string;
}

export interface MediaUploadResponse {
  session_id: string;
  phone: string;
  step: string;
  image_url: string;
  cloudinary_public_id: string;
  prompt_text_hi: string;
  audio_script_text: string;
  whatsapp_message_id?: string;
  is_duplicate: boolean;
  mode: string;
}

export interface VoiceProcessPayload {
  phone: string;
  audio_url?: string;
  audio_base64?: string;
  audio_id?: string;
  language?: string;
  stt_provider?: string;
  whatsapp_message_id?: string;
  content_type?: string;
}

export interface InteractiveButton {
  id: string;
  title: string;
}

export interface CraftExtraction {
  title?: string;
  craft?: string;
  materials: string[];
  colour?: string;
  language: string;
  estimated_labour_hours?: number;
  confidence: number;
}

export interface FairPriceEstimate {
  material_cost: number;
  labour_cost: number;
  packaging_cost: number;
  overhead_cost: number;
  platform_fee: number;
  floor_price: number;
  suggested_price: number;
  artisan_earnings: number;
  currency: string;
  is_complete: boolean;
  breakdown_notes: string[];
}

export interface VoiceProcessResponse {
  session_id: string;
  phone: string;
  step: string;
  status: string;
  transcript: string;
  draft_id?: string;
  extracted_craft?: CraftExtraction;
  fair_price?: FairPriceEstimate;
  hindi_text: string;
  audio_script_text: string;
  interactive_buttons: InteractiveButton[];
  missing_fields: string[];
  needs_clarification: boolean;
  whatsapp_message_id?: string;
  is_duplicate: boolean;
  mode: string;
}

export interface ApprovePayload {
  phone: string;
  button_id: string;
  draft_id?: string;
  whatsapp_message_id?: string;
}

export interface ApproveResponse {
  session_id: string;
  phone: string;
  draft_id: string;
  action_taken: string;
  new_status: string;
  requires_coordinator_review: boolean;
  watermarked_image_url?: string;
  hindi_text: string;
  audio_script_text: string;
  whatsapp_message_id?: string;
  is_duplicate: boolean;
  mode: string;
}

export interface SessionDetailResponse {
  session_id: string;
  phone: string;
  artisan_id?: string;
  step: string;
  status: string;
  image_url?: string;
  cloudinary_public_id?: string;
  transcript?: string;
  extracted_craft?: Record<string, unknown>;
  fair_price?: Record<string, unknown>;
  draft_id?: string;
  draft_status?: string;
  last_activity_at: string;
  mode: string;
}

export async function uploadArtisanMedia(
  payload: MediaUploadPayload,
  serviceToken: string,
): Promise<MediaUploadResponse> {
  return apiClient.post<MediaUploadResponse>(
    "/api/v1/internal/whatsapp/media",
    payload,
    {
      headers: {
        "X-Service-Token": serviceToken,
        "Content-Type": "application/json",
      },
    },
  );
}

export async function processArtisanVoice(
  payload: VoiceProcessPayload,
  serviceToken: string,
): Promise<VoiceProcessResponse> {
  return apiClient.post<VoiceProcessResponse>(
    "/api/v1/internal/whatsapp/voice",
    payload,
    {
      headers: {
        "X-Service-Token": serviceToken,
        "Content-Type": "application/json",
      },
    },
  );
}

export async function approveArtisanDraft(
  payload: ApprovePayload,
  serviceToken: string,
): Promise<ApproveResponse> {
  return apiClient.post<ApproveResponse>(
    "/api/v1/internal/whatsapp/approve",
    payload,
    {
      headers: {
        "X-Service-Token": serviceToken,
        "Content-Type": "application/json",
      },
    },
  );
}

export async function getArtisanSession(
  phone: string,
  serviceToken: string,
): Promise<SessionDetailResponse> {
  return apiClient.get<SessionDetailResponse>(
    `/api/v1/internal/whatsapp/session/${encodeURIComponent(phone)}`,
    {
      headers: {
        "X-Service-Token": serviceToken,
      },
    },
  );
}

