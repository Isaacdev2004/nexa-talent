export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      application_documents: {
        Row: {
          application_id: string
          created_at: string
          document_id: string
          file_name: string
          id: string
          kind: string
          storage_path: string
        }
        Insert: {
          application_id: string
          created_at?: string
          document_id: string
          file_name: string
          id?: string
          kind: string
          storage_path: string
        }
        Update: {
          application_id?: string
          created_at?: string
          document_id?: string
          file_name?: string
          id?: string
          kind?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      application_events: {
        Row: {
          actor_id: string | null
          application_id: string
          created_at: string
          id: string
          note: string | null
          status: Database["public"]["Enums"]["application_status"]
        }
        Insert: {
          actor_id?: string | null
          application_id: string
          created_at?: string
          id?: string
          note?: string | null
          status: Database["public"]["Enums"]["application_status"]
        }
        Update: {
          actor_id?: string | null
          application_id?: string
          created_at?: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["application_status"]
        }
        Relationships: [
          {
            foreignKeyName: "application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          application_id: string
          candidate_user_id: string
          findings: Json
          id: string
          job_snapshot: Json
          missing_requirements: string
          outcome: string | null
          published_at: string | null
          recommendations: string
          requested_at: string
          resume_document_id: string
          resume_name: string
          resume_path: string
          reviewer_id: string | null
          status: string
          supporting_documents: string
          updated_at: string
        }
        Insert: {
          application_id: string
          candidate_user_id: string
          findings?: Json
          id?: string
          job_snapshot: Json
          missing_requirements?: string
          outcome?: string | null
          published_at?: string | null
          recommendations?: string
          requested_at?: string
          resume_document_id: string
          resume_name: string
          resume_path: string
          reviewer_id?: string | null
          status?: string
          supporting_documents?: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          candidate_user_id?: string
          findings?: Json
          id?: string
          job_snapshot?: Json
          missing_requirements?: string
          outcome?: string | null
          published_at?: string | null
          recommendations?: string
          requested_at?: string
          resume_document_id?: string
          resume_name?: string
          resume_path?: string
          reviewer_id?: string | null
          status?: string
          supporting_documents?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_resume_document_id_fkey"
            columns: ["resume_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      candidate_opportunities: {
        Row: {
          candidate_email: string
          candidate_response: string | null
          candidate_user_id: string | null
          created_at: string
          id: string
          job_id: string
          responded_at: string | null
          shared_by: string
          shared_description: string
          staff_note: string | null
          status: string
          updated_at: string
        }
        Insert: {
          candidate_email: string
          candidate_response?: string | null
          candidate_user_id?: string | null
          created_at?: string
          id?: string
          job_id: string
          responded_at?: string | null
          shared_by: string
          shared_description: string
          staff_note?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          candidate_email?: string
          candidate_response?: string | null
          candidate_user_id?: string | null
          created_at?: string
          id?: string
          job_id?: string
          responded_at?: string | null
          shared_by?: string
          shared_description?: string
          staff_note?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_opportunities_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          certifications: string[]
          created_at: string
          current_position: string | null
          deleted_at: string | null
          education: Json
          employment_history: Json
          employment_types: string[]
          expected_salary: string | null
          id: string
          industry: string | null
          onboarding_step: number
          preferred_locations: string[]
          preferred_titles: string[]
          profile_visibility: string
          skills: string[]
          summary: string | null
          updated_at: string
          user_id: string
          work_arrangement: string | null
          years_experience: number | null
        }
        Insert: {
          certifications?: string[]
          created_at?: string
          current_position?: string | null
          deleted_at?: string | null
          education?: Json
          employment_history?: Json
          employment_types?: string[]
          expected_salary?: string | null
          id?: string
          industry?: string | null
          onboarding_step?: number
          preferred_locations?: string[]
          preferred_titles?: string[]
          profile_visibility?: string
          skills?: string[]
          summary?: string | null
          updated_at?: string
          user_id: string
          work_arrangement?: string | null
          years_experience?: number | null
        }
        Update: {
          certifications?: string[]
          created_at?: string
          current_position?: string | null
          deleted_at?: string | null
          education?: Json
          employment_history?: Json
          employment_types?: string[]
          expected_salary?: string | null
          id?: string
          industry?: string | null
          onboarding_step?: number
          preferred_locations?: string[]
          preferred_titles?: string[]
          profile_visibility?: string
          skills?: string[]
          summary?: string | null
          updated_at?: string
          user_id?: string
          work_arrangement?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          country: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          industry: string | null
          name: string
          owner_id: string
          updated_at: string
          verified: boolean
          website: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          name: string
          owner_id: string
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          name?: string
          owner_id?: string
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: []
      }
      consent_records: {
        Row: {
          consent_type: string
          created_at: string
          granted: boolean
          id: string
          user_id: string
          version: string
        }
        Insert: {
          consent_type: string
          created_at?: string
          granted: boolean
          id?: string
          user_id: string
          version: string
        }
        Update: {
          consent_type?: string
          created_at?: string
          granted?: boolean
          id?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      contact_enquiries: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          kind: string
          message: string
          name: string
          status: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          kind: string
          message: string
          name: string
          status?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          kind?: string
          message?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          deleted_at: string | null
          file_name: string
          id: string
          kind: string
          mime_type: string
          owner_id: string
          size_bytes: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          file_name: string
          id?: string
          kind: string
          mime_type: string
          owner_id: string
          size_bytes: number
          storage_path: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          file_name?: string
          id?: string
          kind?: string
          mime_type?: string
          owner_id?: string
          size_bytes?: number
          storage_path?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          answers: Json
          candidate_user_id: string
          confirmations: Json
          cover_letter: string | null
          id: string
          job_id: string
          job_snapshot: Json
          profile_snapshot: Json
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string
          updated_at: string
        }
        Insert: {
          answers?: Json
          candidate_user_id: string
          confirmations?: Json
          cover_letter?: string | null
          id?: string
          job_id: string
          job_snapshot: Json
          profile_snapshot: Json
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          answers?: Json
          candidate_user_id?: string
          confirmations?: Json
          cover_letter?: string | null
          id?: string
          job_id?: string
          job_snapshot?: Json
          profile_snapshot?: Json
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          closing_date: string | null
          company_id: string | null
          country: string
          created_at: string
          created_by: string
          currency: string | null
          deleted_at: string | null
          department: string | null
          description: string
          employer_display_name: string
          employment_type: string
          id: string
          is_demo: boolean
          listing_paid_at: string | null
          location: string
          published_at: string | null
          salary_text: string | null
          slug: string
          source: string | null
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
          work_arrangement: string
        }
        Insert: {
          closing_date?: string | null
          company_id?: string | null
          country: string
          created_at?: string
          created_by: string
          currency?: string | null
          deleted_at?: string | null
          department?: string | null
          description?: string
          employer_display_name: string
          employment_type: string
          id?: string
          is_demo?: boolean
          listing_paid_at?: string | null
          location: string
          published_at?: string | null
          salary_text?: string | null
          slug: string
          source?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
          work_arrangement: string
        }
        Update: {
          closing_date?: string | null
          company_id?: string | null
          country?: string
          created_at?: string
          created_by?: string
          currency?: string | null
          deleted_at?: string | null
          department?: string | null
          description?: string
          employer_display_name?: string
          employment_type?: string
          id?: string
          is_demo?: boolean
          listing_paid_at?: string | null
          location?: string
          published_at?: string | null
          salary_text?: string | null
          slug?: string
          source?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
          work_arrangement?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: { amount_cents: number; basis_cents: number; created_at: string; currency: string; id: string; payee_user_id: string; rate_bps: number; source: string; source_id: string; status: string }
        Insert: { amount_cents: number; basis_cents: number; created_at?: string; currency: string; id?: string; payee_user_id: string; rate_bps: number; source: string; source_id: string; status?: string }
        Update: { amount_cents?: number; basis_cents?: number; created_at?: string; currency?: string; id?: string; payee_user_id?: string; rate_bps?: number; source?: string; source_id?: string; status?: string }
        Relationships: []
      }
      email_outbox: {
        Row: { body: string; created_at: string; error: string | null; id: string; link: string | null; sent_at: string | null; status: string; subject: string; to_email: string; user_id: string }
        Insert: { body: string; created_at?: string; error?: string | null; id?: string; link?: string | null; sent_at?: string | null; status?: string; subject: string; to_email: string; user_id: string }
        Update: { body?: string; created_at?: string; error?: string | null; id?: string; link?: string | null; sent_at?: string | null; status?: string; subject?: string; to_email?: string; user_id?: string }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      order_deliverables: {
        Row: {
          created_at: string
          created_by: string
          file_name: string
          id: string
          mime_type: string
          note: string
          order_id: string
          size_bytes: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          created_by: string
          file_name: string
          id?: string
          mime_type: string
          note?: string
          order_id: string
          size_bytes: number
          storage_path: string
        }
        Update: {
          created_at?: string
          created_by?: string
          file_name?: string
          id?: string
          mime_type?: string
          note?: string
          order_id?: string
          size_bytes?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_deliverables_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          order_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          order_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          order_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: { amount_cents: number; created_at: string; currency: string; id: string; job_id: string | null; kind: string; order_id: string | null; paid_at: string | null; payer_user_id: string; status: string; stripe_payment_intent: string | null; stripe_session_id: string | null }
        Insert: { amount_cents: number; created_at?: string; currency: string; id?: string; job_id?: string | null; kind: string; order_id?: string | null; paid_at?: string | null; payer_user_id: string; status?: string; stripe_payment_intent?: string | null; stripe_session_id?: string | null }
        Update: { amount_cents?: number; created_at?: string; currency?: string; id?: string; job_id?: string | null; kind?: string; order_id?: string | null; paid_at?: string | null; payer_user_id?: string; status?: string; stripe_payment_intent?: string | null; stripe_session_id?: string | null }
        Relationships: []
      }
      payouts: {
        Row: { amount_cents: number; created_at: string; created_by: string; currency: string; id: string; paid_at: string | null; payee_user_id: string; reference: string | null; status: string }
        Insert: { amount_cents: number; created_at?: string; created_by: string; currency: string; id?: string; paid_at?: string | null; payee_user_id: string; reference?: string | null; status?: string }
        Update: { amount_cents?: number; created_at?: string; created_by?: string; currency?: string; id?: string; paid_at?: string | null; payee_user_id?: string; reference?: string | null; status?: string }
        Relationships: []
      }
      outreach_records: {
        Row: {
          candidate_email: string | null
          candidate_name: string
          candidate_user_id: string | null
          channel: string
          created_at: string
          created_by: string
          follow_up_on: string | null
          id: string
          job_id: string | null
          notes: string | null
          outcome: string
          updated_at: string
        }
        Insert: {
          candidate_email?: string | null
          candidate_name: string
          candidate_user_id?: string | null
          channel: string
          created_at?: string
          created_by: string
          follow_up_on?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          outcome?: string
          updated_at?: string
        }
        Update: {
          candidate_email?: string | null
          candidate_name?: string
          candidate_user_id?: string | null
          channel?: string
          created_at?: string
          created_by?: string
          follow_up_on?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          outcome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_records_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      recruiter_assignments: {
        Row: { commission_bps: number; created_at: string; created_by: string; id: string; job_id: string; recruiter_user_id: string; responded_at: string | null; status: string; terms: string }
        Insert: { commission_bps?: number; created_at?: string; created_by: string; id?: string; job_id: string; recruiter_user_id: string; responded_at?: string | null; status?: string; terms?: string }
        Update: { commission_bps?: number; created_at?: string; created_by?: string; id?: string; job_id?: string; recruiter_user_id?: string; responded_at?: string | null; status?: string; terms?: string }
        Relationships: []
      }
      recruiter_submissions: {
        Row: { assignment_id: string; candidate_email: string; candidate_name: string; consent: boolean; created_at: string; currency: string; id: string; note: string; placement_cents: number | null; status: string }
        Insert: { assignment_id: string; candidate_email: string; candidate_name: string; consent: boolean; created_at?: string; currency?: string; id?: string; note?: string; placement_cents?: number | null; status?: string }
        Update: { assignment_id?: string; candidate_email?: string; candidate_name?: string; consent?: boolean; created_at?: string; currency?: string; id?: string; note?: string; placement_cents?: number | null; status?: string }
        Relationships: []
      }
      refund_requests: {
        Row: { amount_cents: number; created_at: string; currency: string; id: string; opened_by: string; order_id: string | null; payment_id: string | null; reason: string; resolved_at: string | null; resolved_by: string | null; status: string; stripe_refund_id: string | null }
        Insert: { amount_cents: number; created_at?: string; currency: string; id?: string; opened_by: string; order_id?: string | null; payment_id?: string | null; reason: string; resolved_at?: string | null; resolved_by?: string | null; status?: string; stripe_refund_id?: string | null }
        Update: { amount_cents?: number; created_at?: string; currency?: string; id?: string; opened_by?: string; order_id?: string | null; payment_id?: string | null; reason?: string; resolved_at?: string | null; resolved_by?: string | null; status?: string; stripe_refund_id?: string | null }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          full_name: string
          id: string
          must_change_password: boolean
          phone: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id: string
          must_change_password?: boolean
          phone?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          must_change_password?: boolean
          phone?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quotations: {
        Row: {
          amount: number
          created_at: string
          currency: string
          deliverables: string
          delivery_days: number
          exclusions: string
          expires_at: string
          id: string
          items: Json
          referral_id: string
          responded_at: string | null
          revisions: number
          scope: string
          service_name: string
          status: string
          terms: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          deliverables: string
          delivery_days: number
          exclusions: string
          expires_at: string
          id?: string
          items: Json
          referral_id: string
          responded_at?: string | null
          revisions: number
          scope: string
          service_name: string
          status?: string
          terms: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          deliverables?: string
          delivery_days?: number
          exclusions?: string
          expires_at?: string
          id?: string
          items?: Json
          referral_id?: string
          responded_at?: string | null
          revisions?: number
          scope?: string
          service_name?: string
          status?: string
          terms?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotations_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "specialist_referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          agreement: Json
          candidate_name: string
          candidate_user_id: string
          created_at: string
          due_at: string | null
          id: string
          paid_at: string | null
          payment_reference: string | null
          quotation_id: string
          referral_id: string
          revisions_used: number
          specialist_name: string
          specialist_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          agreement: Json
          candidate_name: string
          candidate_user_id: string
          created_at?: string
          due_at?: string | null
          id?: string
          paid_at?: string | null
          payment_reference?: string | null
          quotation_id: string
          referral_id: string
          revisions_used?: number
          specialist_name: string
          specialist_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          agreement?: Json
          candidate_name?: string
          candidate_user_id?: string
          created_at?: string
          due_at?: string | null
          id?: string
          paid_at?: string | null
          payment_reference?: string | null
          quotation_id?: string
          referral_id?: string
          revisions_used?: number
          specialist_name?: string
          specialist_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: true
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "specialist_referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      specialist_profiles: {
        Row: {
          biography: string
          certifications: string
          country: string
          experience: string
          expertise: string
          languages: string
          portfolio_url: string
          preferred_currency: string
          professional_name: string
          review_note: string
          reviewed_at: string | null
          reviewed_by: string | null
          services: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          biography?: string
          certifications?: string
          country?: string
          experience?: string
          expertise?: string
          languages?: string
          portfolio_url?: string
          preferred_currency?: string
          professional_name: string
          review_note?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          services?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          biography?: string
          certifications?: string
          country?: string
          experience?: string
          expertise?: string
          languages?: string
          portfolio_url?: string
          preferred_currency?: string
          professional_name?: string
          review_note?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          services?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      specialist_referrals: {
        Row: {
          assessment_id: string
          candidate_name: string
          candidate_user_id: string
          consented_at: string | null
          created_at: string
          created_by: string
          id: string
          requirements: string
          responded_at: string | null
          service_name: string
          specialist_name: string
          specialist_user_id: string
          status: string
        }
        Insert: {
          assessment_id: string
          candidate_name: string
          candidate_user_id: string
          consented_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          requirements: string
          responded_at?: string | null
          service_name: string
          specialist_name: string
          specialist_user_id: string
          status?: string
        }
        Update: {
          assessment_id?: string
          candidate_name?: string
          candidate_user_id?: string
          consented_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          requirements?: string
          responded_at?: string | null
          service_name?: string
          specialist_name?: string
          specialist_user_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialist_referrals_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_referrals_specialist_user_id_fkey"
            columns: ["specialist_user_id"]
            isOneToOne: false
            referencedRelation: "specialist_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      staff_role_grants: {
        Row: {
          claimed_at: string | null
          created_at: string
          email: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          email: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          email?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_order_delivery: {
        Args: {
          _id: string
          _mime: string
          _name: string
          _note: string
          _path: string
          _size: number
        }
        Returns: undefined
      }
      apply_staff_grant: {
        Args: { _email: string; _user_id: string }
        Returns: undefined
      }
      claim_oauth_account_type: { Args: { _type: string }; Returns: undefined }
      approved_specialists: {
        Args: never
        Returns: {
          biography: string
          certifications: string
          country: string
          experience: string
          expertise: string
          languages: string
          portfolio_url: string
          preferred_currency: string
          professional_name: string
          services: string
          user_id: string
        }[]
      }
      can_read_referred_resume: { Args: { _path: string }; Returns: boolean }
      complete_password_change: { Args: never; Returns: undefined }
      apply_verified_payment: { Args: { _amount_cents: number; _currency: string; _intent: string; _payment_id: string }; Returns: undefined }
      confirm_service_payment: {
        Args: {
          _amount: number
          _currency: string
          _order_id: string
          _reference: string
        }
        Returns: undefined
      }
      create_specialist_referral: {
        Args: {
          _assessment_id: string
          _requirements: string
          _service: string
          _specialist_id: string
        }
        Returns: string
      }
      employer_owns_job: {
        Args: { _job_id: string; _user_id: string }
        Returns: boolean
      }
      employer_set_application_status: {
        Args: {
          _id: string
          _status: Database["public"]["Enums"]["application_status"]
        }
        Returns: undefined
      }
      employer_set_job_status: {
        Args: {
          _job_id: string
          _status: Database["public"]["Enums"]["job_status"]
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_employer: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      list_recruiters: { Args: never; Returns: { account_status: string; email: string; full_name: string; user_id: string }[] }
      mark_refund_settled: { Args: { _id: string; _stripe_refund_id: string }; Returns: undefined }
      my_assessments: {
        Args: never
        Returns: {
          application_id: string
          candidate_user_id: string
          findings: Json
          id: string
          job_snapshot: Json
          missing_requirements: string
          outcome: string | null
          published_at: string | null
          recommendations: string
          requested_at: string
          resume_document_id: string
          resume_name: string
          resume_path: string
          reviewer_id: string | null
          status: string
          supporting_documents: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "assessments"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      owns_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      referral_resume: {
        Args: { _id: string }
        Returns: {
          file_name: string
          storage_path: string
        }[]
      }
      recruiter_respond_assignment: { Args: { _accept: boolean; _id: string }; Returns: undefined }
      recruiter_submit_candidate: { Args: { _assignment_id: string; _email: string; _name: string; _note: string }; Returns: string }
      request_assessment: { Args: { _application_id: string }; Returns: string }
      request_service_refund: { Args: { _order_id: string; _reason: string }; Returns: string }
      respond_quotation: {
        Args: { _accept: boolean; _id: string }
        Returns: string
      }
      respond_specialist_referral: {
        Args: { _consent: boolean; _id: string }
        Returns: undefined
      }
      respond_to_opportunity: {
        Args: { _id: string; _interested: boolean; _message: string }
        Returns: undefined
      }
      review_specialist: {
        Args: { _approve: boolean; _note: string; _user_id: string }
        Returns: undefined
      }
      staff_mark_payout_paid: { Args: { _id: string; _reference: string }; Returns: undefined }
      staff_offer_assignment: { Args: { _job_id: string; _rate_bps: number; _recruiter_id: string; _terms: string }; Returns: string }
      staff_resolve_refund: { Args: { _approve: boolean; _id: string }; Returns: undefined }
      staff_schedule_payout: { Args: { _currency: string; _payee: string }; Returns: string }
      staff_set_submission_status: { Args: { _currency: string; _id: string; _placement_cents: number; _status: string }; Returns: undefined }
      save_assessment: {
        Args: {
          _findings: Json
          _id: string
          _missing: string
          _outcome: string
          _publish: boolean
          _recommendations: string
          _supporting: string
        }
        Returns: undefined
      }
      send_order_message: {
        Args: { _body: string; _id: string }
        Returns: undefined
      }
      send_quotation: {
        Args: { _quote: Json; _referral_id: string }
        Returns: string
      }
      submit_application: {
        Args: {
          _answers: Json
          _confirmations: Json
          _cover_letter: string
          _job_slug: string
          _resume_id: string
          _supporting_ids: string[]
        }
        Returns: string
      }
      submit_specialist_profile: {
        Args: { _profile: Json }
        Returns: undefined
      }
      transition_service_order: {
        Args: { _id: string; _note: string; _status: string }
        Returns: undefined
      }
    }
    Enums: {
      account_status: "active" | "pending_review" | "suspended"
      app_role:
        | "candidate"
        | "employer"
        | "recruiter"
        | "specialist"
        | "recruitment_officer"
        | "admin"
        | "super_admin"
      application_status:
        | "submitted"
        | "under_review"
        | "shortlisted"
        | "interview_scheduled"
        | "interviewed"
        | "offered"
        | "hired"
        | "rejected"
        | "withdrawn"
      job_status:
        | "draft"
        | "pending_approval"
        | "published"
        | "closed"
        | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["active", "pending_review", "suspended"],
      app_role: [
        "candidate",
        "employer",
        "recruiter",
        "specialist",
        "recruitment_officer",
        "admin",
        "super_admin",
      ],
      application_status: [
        "submitted",
        "under_review",
        "shortlisted",
        "interview_scheduled",
        "interviewed",
        "offered",
        "hired",
        "rejected",
        "withdrawn",
      ],
      job_status: [
        "draft",
        "pending_approval",
        "published",
        "closed",
        "archived",
      ],
    },
  },
} as const
