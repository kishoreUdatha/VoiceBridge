# AWS Partnership Proposal

## MyLeadX - AI-Powered Sales & Communication Platform

**Document Version:** 1.0
**Date:** May 2026
**Company:** MyLeadX
**Contact:** Kishore (CEO) | kishore@myleadx.ai | +91-9876543210
**Website:** https://myleadx.ai
**Location:** Hyderabad, India

---

## Executive Summary

MyLeadX is an AI-powered sales and communication platform designed to revolutionize how businesses manage leads, automate outreach, and engage customers through voice, SMS, WhatsApp, and email channels. We are seeking AWS partnership and credits to scale our AI infrastructure, deploy self-hosted ML models, and expand our customer base across India and Southeast Asia.

### Key Highlights

| Metric | Value |
|--------|-------|
| **Platform Type** | B2B SaaS |
| **Target Market** | India, Southeast Asia |
| **Current Users** | [X] Active Organizations |
| **Monthly Interactions** | [X] Voice/SMS/WhatsApp |
| **AWS Credits Requested** | $200,000 |
| **Deployment Region** | ap-south-1 (Mumbai) |

---

## 1. Company Overview

### 1.1 Problem Statement

Small and medium businesses in India face significant challenges:
- **High cost** of sales team management
- **Inefficient** lead follow-up processes
- **Expensive** third-party AI/voice services
- **Limited access** to enterprise-grade CRM tools
- **Language barriers** with English-only AI solutions

### 1.2 Our Solution

MyLeadX provides an all-in-one platform that:
- Automates lead management and follow-ups
- Provides AI-powered voice agents for outbound/inbound calls
- Supports Indian regional languages (Hindi, Tamil, Telugu, etc.)
- Integrates WhatsApp, SMS, and Email in a unified inbox
- Offers telecaller workforce management tools
- Delivers actionable analytics and reporting

### 1.3 Competitive Advantage

| Feature | MyLeadX | Competitors |
|---------|---------|-------------|
| Indian Language Support | 10+ languages | Limited |
| Self-hosted AI Models | Yes (Cost-effective) | Third-party APIs |
| Voice AI Agents | Real-time, Low latency | High latency |
| Pricing | SMB-friendly | Enterprise pricing |
| WhatsApp Integration | Native | Add-on |

---

## 2. Technical Architecture

### 2.1 Current Architecture (Production)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AWS Cloud (ap-south-1)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        VPC (10.0.0.0/16)                         │   │
│  │                                                                   │   │
│  │  ┌─────────────────────────────────────────────────────────┐     │   │
│  │  │              Public Subnet (10.0.1.0/24)                 │     │   │
│  │  │                                                          │     │   │
│  │  │  ┌──────────────────────────────────────────────────┐   │     │   │
│  │  │  │           EC2 (t3.medium)                         │   │     │   │
│  │  │  │  ┌────────────────┐  ┌────────────────┐          │   │     │   │
│  │  │  │  │   Frontend     │  │   Backend      │          │   │     │   │
│  │  │  │  │   (React)      │  │   (Node.js)    │          │   │     │   │
│  │  │  │  │   Port 3000    │  │   Port 8080    │          │   │     │   │
│  │  │  │  └────────────────┘  └────────────────┘          │   │     │   │
│  │  │  │                                                   │   │     │   │
│  │  │  │  ┌────────────────────────────────────┐          │   │     │   │
│  │  │  │  │   Nginx (Reverse Proxy + SSL)      │          │   │     │   │
│  │  │  │  └────────────────────────────────────┘          │   │     │   │
│  │  │  └──────────────────────────────────────────────────┘   │     │   │
│  │  │                          │                               │     │   │
│  │  │                   Elastic IP                             │     │   │
│  │  └──────────────────────────┼───────────────────────────────┘     │   │
│  │                             │                                      │   │
│  │  ┌──────────────────────────┼───────────────────────────────┐     │   │
│  │  │        Private Subnets (10.0.2.0/24, 10.0.3.0/24)        │     │   │
│  │  │                          │                                │     │   │
│  │  │              ┌───────────▼───────────┐                   │     │   │
│  │  │              │   RDS PostgreSQL      │                   │     │   │
│  │  │              │   (db.t3.micro)       │                   │     │   │
│  │  │              │   Multi-AZ Ready      │                   │     │   │
│  │  │              └───────────────────────┘                   │     │   │
│  │  └──────────────────────────────────────────────────────────┘     │   │
│  │                                                                   │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      S3 Storage                                  │   │
│  │  ┌─────────────────┐  ┌─────────────────┐                       │   │
│  │  │ Uploads Bucket  │  │ Recordings      │                       │   │
│  │  │ (Documents,     │  │ Bucket          │                       │   │
│  │  │  Attachments)   │  │ (Call Records)  │                       │   │
│  │  └─────────────────┘  └─────────────────┘                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      SES (Email Service)                         │   │
│  │  • Transactional Emails    • Campaign Emails                    │   │
│  │  • Bounce/Complaint Handling via SNS Webhooks                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────┐
                    │      External Integrations      │
                    ├─────────────────────────────────┤
                    │  • Twilio/Plivo (Voice/SMS)     │
                    │  • WhatsApp Business API        │
                    │  • OpenAI (LLM)                 │
                    │  • Deepgram (STT)               │
                    │  • ElevenLabs (TTS)             │
                    │  • Razorpay (Payments)          │
                    │  • Firebase (Push Notifications)│
                    └─────────────────────────────────┘
```

### 2.2 Proposed Architecture (With Self-Hosted AI)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AWS Cloud (ap-south-1)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                        VPC (10.0.0.0/16)                            │     │
│  │                                                                     │     │
│  │  ┌───────────────────────────────────────────────────────────┐     │     │
│  │  │                 Public Subnet (10.0.1.0/24)                │     │     │
│  │  │                                                            │     │     │
│  │  │  ┌────────────────────────────────────────────────────┐   │     │     │
│  │  │  │        Application Load Balancer (ALB)             │   │     │     │
│  │  │  │   • SSL Termination (ACM Certificate)              │   │     │     │
│  │  │  │   • Path-based routing                             │   │     │     │
│  │  │  │   • Health checks                                  │   │     │     │
│  │  │  └────────────────────────┬───────────────────────────┘   │     │     │
│  │  │                           │                                │     │     │
│  │  │       ┌───────────────────┼───────────────────┐           │     │     │
│  │  │       │                   │                   │           │     │     │
│  │  │       ▼                   ▼                   ▼           │     │     │
│  │  │  ┌─────────┐        ┌─────────┐        ┌─────────┐       │     │     │
│  │  │  │EC2 App 1│        │EC2 App 2│        │EC2 App 3│       │     │     │
│  │  │  │t3.medium│        │t3.medium│        │t3.medium│       │     │     │
│  │  │  └─────────┘        └─────────┘        └─────────┘       │     │     │
│  │  │       │                   │                   │           │     │     │
│  │  │       └───────────────────┼───────────────────┘           │     │     │
│  │  │                           │                                │     │     │
│  │  │              Auto Scaling Group (Min:2, Max:5)            │     │     │
│  │  └───────────────────────────┼────────────────────────────────┘     │     │
│  │                              │                                       │     │
│  │  ┌───────────────────────────┼────────────────────────────────┐     │     │
│  │  │          Private Subnet - AI Inference Layer               │     │     │
│  │  │                           │                                 │     │     │
│  │  │  ┌────────────────────────▼────────────────────────────┐   │     │     │
│  │  │  │            Internal Load Balancer                    │   │     │     │
│  │  │  └────────────────────────┬────────────────────────────┘   │     │     │
│  │  │                           │                                 │     │     │
│  │  │    ┌──────────────────────┼──────────────────────┐         │     │     │
│  │  │    │                      │                      │         │     │     │
│  │  │    ▼                      ▼                      ▼         │     │     │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │     │     │
│  │  │  │  g5.xlarge   │  │  g5.xlarge   │  │  g5.xlarge   │     │     │     │
│  │  │  │  (GPU Spot)  │  │  (GPU Spot)  │  │  (GPU Spot)  │     │     │     │
│  │  │  │              │  │              │  │              │     │     │     │
│  │  │  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │     │     │     │
│  │  │  │ │ Qwen2.5  │ │  │ │ Qwen2.5  │ │  │ │ Qwen2.5  │ │     │     │     │
│  │  │  │ │ 7B (LLM) │ │  │ │ 7B (LLM) │ │  │ │ 7B (LLM) │ │     │     │     │
│  │  │  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │     │     │     │
│  │  │  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │     │     │     │
│  │  │  │ │ Whisper  │ │  │ │ Whisper  │ │  │ │ Whisper  │ │     │     │     │
│  │  │  │ │ (STT)    │ │  │ │ (STT)    │ │  │ │ (STT)    │ │     │     │     │
│  │  │  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │     │     │     │
│  │  │  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │     │     │     │
│  │  │  │ │ XTTS-v2  │ │  │ │ XTTS-v2  │ │  │ │ XTTS-v2  │ │     │     │     │
│  │  │  │ │ (TTS)    │ │  │ │ (TTS)    │ │  │ │ (TTS)    │ │     │     │     │
│  │  │  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │     │     │     │
│  │  │  └──────────────┘  └──────────────┘  └──────────────┘     │     │     │
│  │  │                                                            │     │     │
│  │  │         Auto Scaling Group (GPU) - Min:1, Max:5            │     │     │
│  │  └────────────────────────────────────────────────────────────┘     │     │
│  │                                                                     │     │
│  │  ┌────────────────────────────────────────────────────────────┐     │     │
│  │  │              Private Subnet - Database Layer                │     │     │
│  │  │                                                             │     │     │
│  │  │  ┌─────────────────────┐  ┌─────────────────────┐          │     │     │
│  │  │  │   RDS PostgreSQL    │  │   ElastiCache       │          │     │     │
│  │  │  │   (db.t3.medium)    │  │   Redis             │          │     │     │
│  │  │  │   Multi-AZ          │  │   (cache.t3.micro)  │          │     │     │
│  │  │  └─────────────────────┘  └─────────────────────┘          │     │     │
│  │  └────────────────────────────────────────────────────────────┘     │     │
│  │                                                                     │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                         Storage Layer                               │     │
│  │                                                                     │     │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │     │
│  │  │  S3 Uploads     │  │  S3 Recordings  │  │  S3 ML Models   │    │     │
│  │  │                 │  │  (Lifecycle     │  │  (Model Cache)  │    │     │
│  │  │                 │  │   Policies)     │  │                 │    │     │
│  │  │  Standard       │  │  IA → Glacier   │  │  Standard       │    │     │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘    │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                      Messaging & Monitoring                         │     │
│  │                                                                     │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │     │
│  │  │   SES    │  │   SNS    │  │   SQS    │  │CloudWatch│           │     │
│  │  │  Email   │  │  Notify  │  │  Queue   │  │ Logging  │           │     │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. GPU Infrastructure Requirements

### 3.1 GPU Instance Selection

| Instance | GPU | VRAM | vCPUs | RAM | Use Case | Cost/hr (Spot) |
|----------|-----|------|-------|-----|----------|----------------|
| **g4dn.xlarge** | NVIDIA T4 | 16 GB | 4 | 16 GB | Dev/Test, Light inference | $0.21 |
| **g5.xlarge** | NVIDIA A10G | 24 GB | 4 | 16 GB | Production STT/TTS | $0.41 |
| **g5.2xlarge** | NVIDIA A10G | 24 GB | 8 | 32 GB | Production LLM inference | $0.49 |
| **g5.4xlarge** | NVIDIA A10G | 24 GB | 16 | 64 GB | High-throughput inference | $0.82 |
| **p4d.24xlarge** | 8x NVIDIA A100 | 320 GB | 96 | 1152 GB | Model fine-tuning | $13.00 |

### 3.2 GPU Allocation by Workload

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GPU ALLOCATION MATRIX                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  WORKLOAD              │ GPU INSTANCE      │ QTY  │ HOURS/MO │ COST/MO     │
│  ──────────────────────┼───────────────────┼──────┼──────────┼─────────────│
│                                                                              │
│  LLM Inference         │                   │      │          │             │
│  (Qwen2.5-7B)          │ g5.2xlarge        │ 2    │ 1,440    │ $1,050      │
│                        │ (NVIDIA A10G 24GB)│      │          │             │
│  ──────────────────────┼───────────────────┼──────┼──────────┼─────────────│
│                                                                              │
│  Speech-to-Text        │                   │      │          │             │
│  (Faster-Whisper)      │ g5.xlarge         │ 2    │ 1,440    │ $590        │
│                        │ (NVIDIA A10G 24GB)│      │          │             │
│  ──────────────────────┼───────────────────┼──────┼──────────┼─────────────│
│                                                                              │
│  Text-to-Speech        │                   │      │          │             │
│  (XTTS-v2)             │ g5.xlarge         │ 2    │ 1,440    │ $590        │
│                        │ (NVIDIA A10G 24GB)│      │          │             │
│  ──────────────────────┼───────────────────┼──────┼──────────┼─────────────│
│                                                                              │
│  Model Fine-tuning     │                   │      │          │             │
│  (Custom Indian Lang)  │ p4d.24xlarge      │ 1    │ 100      │ $1,300      │
│                        │ (8x NVIDIA A100)  │      │          │             │
│  ──────────────────────┼───────────────────┼──────┼──────────┼─────────────│
│                                                                              │
│  Development/Testing   │                   │      │          │             │
│                        │ g4dn.xlarge       │ 1    │ 720      │ $150        │
│                        │ (NVIDIA T4 16GB)  │      │          │             │
│  ──────────────────────┼───────────────────┼──────┼──────────┼─────────────│
│                                                                              │
│  TOTAL MONTHLY GPU COST (SPOT PRICING)                        │ $3,680      │
│  TOTAL 24-MONTH GPU COST                                      │ $88,320     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 GPU Scaling Plan (24 Months)

| Phase | LLM (g5.2xl) | STT (g5.xl) | TTS (g5.xl) | Fine-tune (p4d) | Dev (g4dn) |
|-------|--------------|-------------|-------------|-----------------|------------|
| **Phase 1** (M1-6) | 1 | 1 | 1 | 50 hrs/mo | 1 |
| **Phase 2** (M7-12) | 2 | 2 | 2 | 80 hrs/mo | 1 |
| **Phase 3** (M13-18) | 3 | 3 | 2 | 100 hrs/mo | 1 |
| **Phase 4** (M19-24) | 4 | 3 | 3 | 120 hrs/mo | 1 |

### 3.4 Why These GPUs?

| GPU | Why Selected |
|-----|--------------|
| **NVIDIA A10G (g5)** | Best price/performance for inference workloads. 24GB VRAM fits all models. Tensor cores for fast FP16 inference. |
| **NVIDIA A100 (p4d)** | Required for fine-tuning large models. 80GB per GPU allows full-precision training. NVLink for multi-GPU scaling. |
| **NVIDIA T4 (g4dn)** | Cost-effective for development. 16GB sufficient for testing. Good for CI/CD pipelines. |

### 3.5 GPU Memory Requirements

```
┌────────────────────────────────────────────────────────────────────────┐
│              PRODUCTION GPU MEMORY LAYOUT (g5.2xlarge)                 │
│                        NVIDIA A10G - 24GB VRAM                         │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │  Qwen2.5-7B-Instruct (4-bit GGUF)              │   6 GB      │     │
│  │  ├─ Model weights                              │   4.5 GB    │     │
│  │  ├─ KV Cache (context)                         │   1.0 GB    │     │
│  │  └─ Inference buffer                           │   0.5 GB    │     │
│  └──────────────────────────────────────────────────────────────┘     │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │  Faster-Whisper Large-v3                       │   6 GB      │     │
│  │  ├─ Model weights (CTranslate2)                │   3.0 GB    │     │
│  │  ├─ Audio processing buffer                    │   2.0 GB    │     │
│  │  └─ Beam search cache                          │   1.0 GB    │     │
│  └──────────────────────────────────────────────────────────────┘     │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │  XTTS-v2 (Coqui TTS)                           │   5 GB      │     │
│  │  ├─ GPT-2 backbone                             │   2.0 GB    │     │
│  │  ├─ HiFi-GAN vocoder                           │   1.5 GB    │     │
│  │  ├─ Speaker encoder                            │   0.5 GB    │     │
│  │  └─ Generation buffer                          │   1.0 GB    │     │
│  └──────────────────────────────────────────────────────────────┘     │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │  CUDA Runtime & Overhead                       │   3 GB      │     │
│  └──────────────────────────────────────────────────────────────┘     │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │  Available Headroom                            │   4 GB      │     │
│  └──────────────────────────────────────────────────────────────┘     │
│                                                                        │
│  TOTAL UTILIZED: 20 GB / 24 GB (83%)                                  │
│  STATUS: ✓ Optimal utilization with room for spikes                   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.6 Fine-tuning GPU Requirements (p4d.24xlarge)

```
┌────────────────────────────────────────────────────────────────────────┐
│           FINE-TUNING INFRASTRUCTURE (p4d.24xlarge)                    │
│                   8x NVIDIA A100 80GB (640GB Total)                    │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  USE CASES:                                                            │
│  ├─ Fine-tune Qwen2.5-7B for Indian languages                         │
│  ├─ Train custom TTS voices (Hindi, Tamil, Telugu)                    │
│  ├─ Adapt Whisper for Indian accents                                  │
│  └─ Domain-specific fine-tuning (sales, support)                      │
│                                                                        │
│  TRAINING SPECS:                                                       │
│  ├─ Batch size: 32 (distributed across 8 GPUs)                        │
│  ├─ Training time: ~20 hours per model                                │
│  ├─ Monthly budget: 100 hours                                         │
│  └─ Models trained: 4-5 per month                                     │
│                                                                        │
│  COST ANALYSIS:                                                        │
│  ├─ On-Demand: $32.77/hr × 100 hrs = $3,277/month                     │
│  ├─ Spot: $13.00/hr × 100 hrs = $1,300/month                          │
│  └─ SAVINGS: 60% with Spot instances                                  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. AI/ML Models Specification (Software)

### 4.1 Large Language Model (LLM)

| Specification | Details |
|---------------|---------|
| **Model** | Qwen2.5-7B-Instruct |
| **Quantization** | GGUF Q4_K_M (4-bit) |
| **Model Size** | ~4.5 GB |
| **VRAM Required** | 6-8 GB |
| **Inference Framework** | vLLM / llama.cpp |
| **Use Cases** | Conversational AI, Lead qualification, Script generation |
| **Languages** | English, Hindi, Tamil, Telugu, Kannada, Bengali |
| **Tokens/second** | ~50-80 tokens/sec on g5.xlarge |

### 4.2 Speech-to-Text (STT)

| Specification | Details |
|---------------|---------|
| **Model** | Faster-Whisper Large-v3 |
| **Model Size** | ~3 GB |
| **VRAM Required** | 6-8 GB |
| **Inference Framework** | faster-whisper (CTranslate2) |
| **Use Cases** | Call transcription, Voice commands, Real-time captioning |
| **Languages** | 100+ languages including Indian languages |
| **Accuracy** | ~95% WER for English, ~90% for Hindi |
| **Speed** | 10-15x real-time on g5.xlarge |

### 4.3 Text-to-Speech (TTS)

| Specification | Details |
|---------------|---------|
| **Model** | XTTS-v2 (Coqui) |
| **Model Size** | ~2 GB |
| **VRAM Required** | 4-6 GB |
| **Inference Framework** | TTS (Coqui) |
| **Use Cases** | Voice AI agents, IVR, Automated calls |
| **Languages** | 17 languages including Hindi |
| **Voice Cloning** | Supported (3-second sample) |
| **Latency** | ~200ms first token |

### 4.4 Combined Model Summary

```
┌────────────────────────────────────────────────────────┐
│           g5.xlarge GPU Memory (24GB VRAM)             │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────────┐     │
│  │  Qwen2.5-7B (4-bit quantized)     │  6 GB    │     │
│  └──────────────────────────────────────────────┘     │
│  ┌──────────────────────────────────────────────┐     │
│  │  Faster-Whisper Large-v3          │  6 GB    │     │
│  └──────────────────────────────────────────────┘     │
│  ┌──────────────────────────────────────────────┐     │
│  │  XTTS-v2                          │  4 GB    │     │
│  └──────────────────────────────────────────────┘     │
│  ┌──────────────────────────────────────────────┐     │
│  │  CUDA Context + Buffer            │  4 GB    │     │
│  └──────────────────────────────────────────────┘     │
│  ┌──────────────────────────────────────────────┐     │
│  │  Available Headroom               │  4 GB    │     │
│  └──────────────────────────────────────────────┘     │
│                                                        │
│  Total Utilized: ~20 GB / 24 GB (83%)                 │
└────────────────────────────────────────────────────────┘
```

---

## 5. AWS Services Utilization Plan

### 5.1 Compute Services

| Service | Configuration | Purpose | Monthly Units |
|---------|---------------|---------|---------------|
| **EC2 (App)** | t3.medium (3 instances) | Application servers | 2,160 hours |
| **EC2 (GPU)** | g5.xlarge Spot (2 instances) | AI inference | 1,440 hours |
| **Auto Scaling** | Dynamic scaling | Handle traffic spikes | Variable |
| **Elastic Load Balancer** | Application LB | Traffic distribution | 1 |

### 5.2 Database Services

| Service | Configuration | Purpose | Monthly Units |
|---------|---------------|---------|---------------|
| **RDS PostgreSQL** | db.t3.medium, Multi-AZ | Primary database | 730 hours |
| **ElastiCache Redis** | cache.t3.micro | Session/cache | 730 hours |

### 5.3 Storage Services

| Service | Configuration | Purpose | Monthly Estimate |
|---------|---------------|---------|------------------|
| **S3 Standard** | General uploads | Documents, images | 100 GB |
| **S3 Intelligent-Tiering** | Call recordings | Auto-optimize storage | 500 GB |
| **S3 (ML Models)** | Model artifacts | Model weights cache | 20 GB |
| **EBS gp3** | EC2 storage | OS + application | 200 GB |

### 5.4 Networking & Security

| Service | Configuration | Purpose |
|---------|---------------|---------|
| **VPC** | Custom VPC | Network isolation |
| **NAT Gateway** | Single AZ | Private subnet internet |
| **AWS WAF** | Basic rules | DDoS protection |
| **ACM** | SSL certificates | HTTPS encryption |
| **Route 53** | DNS management | Domain routing |

### 5.5 Messaging & Integration

| Service | Configuration | Purpose | Monthly Estimate |
|---------|---------------|---------|------------------|
| **SES** | Production access | Transactional email | 100,000 emails |
| **SNS** | Standard topics | Notifications, webhooks | 50,000 publishes |
| **SQS** | Standard queues | Async job processing | 100,000 requests |

### 5.6 Monitoring & Management

| Service | Configuration | Purpose |
|---------|---------------|---------|
| **CloudWatch** | Logs + Metrics | Observability |
| **CloudWatch Alarms** | CPU, Memory, GPU | Alerting |
| **AWS X-Ray** | Tracing | Performance analysis |
| **AWS Secrets Manager** | API keys storage | Security |

---

## 6. 24-Month Cost Projection

### 6.1 Monthly Cost Breakdown by Phase

#### Phase 1: Months 1-6 (Foundation & MVP)

| Service | Configuration | Monthly Cost |
|---------|---------------|-------------|
| EC2 (App) | 2x t3.medium | $70 |
| EC2 (GPU) | 2x g5.xlarge Spot | $600 |
| EC2 (GPU Fine-tune) | p4d.24xlarge (50 hrs) | $650 |
| RDS | db.t3.small | $30 |
| ElastiCache | cache.t3.micro | $15 |
| S3 | 200 GB | $10 |
| SES | 50,000 emails | $5 |
| Load Balancer | 1 ALB | $25 |
| Data Transfer | 200 GB | $20 |
| CloudWatch | Enhanced | $25 |
| Security (WAF, GuardDuty) | Basic | $50 |
| **Monthly Total** | | **$1,500** |
| **Phase 1 Total (6 months)** | | **$9,000** |

#### Phase 2: Months 7-12 (Growth & Scaling)

| Service | Configuration | Monthly Cost |
|---------|---------------|-------------|
| EC2 (App) | 3x t3.medium (ASG) | $105 |
| EC2 (GPU) | 3x g5.xlarge Spot | $900 |
| EC2 (GPU) | 1x g5.2xlarge Spot (LLM) | $350 |
| EC2 (GPU Fine-tune) | p4d.24xlarge (80 hrs) | $1,040 |
| RDS | db.t3.medium Multi-AZ | $120 |
| ElastiCache | cache.t3.small cluster | $50 |
| S3 | 500 GB + Lifecycle | $25 |
| SES | 100,000 emails | $10 |
| Load Balancer | 1 ALB + 1 NLB | $45 |
| CloudFront | 500 GB | $50 |
| NAT Gateway | 1 | $35 |
| Data Transfer | 500 GB | $50 |
| CloudWatch | Full + Alarms | $60 |
| Security (WAF, Shield, GuardDuty) | Enhanced | $100 |
| Secrets Manager | 20 secrets | $10 |
| **Monthly Total** | | **$2,950** |
| **Phase 2 Total (6 months)** | | **$17,700** |

#### Phase 3: Months 13-18 (Scale & Optimization)

| Service | Configuration | Monthly Cost |
|---------|---------------|-------------|
| EC2 (App) | 5x t3.medium (ASG) | $175 |
| EC2 (GPU) | 4x g5.xlarge Spot | $1,200 |
| EC2 (GPU) | 2x g5.2xlarge Spot (LLM) | $700 |
| EC2 (GPU Fine-tune) | p4d.24xlarge (100 hrs) | $1,300 |
| SageMaker | Inference endpoints | $400 |
| RDS | db.t3.large Multi-AZ | $200 |
| ElastiCache | cache.t3.medium cluster | $100 |
| S3 | 1 TB + Intelligent Tiering | $40 |
| SES | 200,000 emails | $20 |
| Load Balancer | ALB + NLB | $60 |
| CloudFront | 1 TB | $90 |
| NAT Gateway | 2 (HA) | $70 |
| Data Transfer | 1 TB | $100 |
| CloudWatch | Full + Container Insights | $80 |
| X-Ray | Tracing | $30 |
| Security Suite | Full | $150 |
| DR (Cross-region) | Replication | $100 |
| **Monthly Total** | | **$4,815** |
| **Phase 3 Total (6 months)** | | **$28,890** |

#### Phase 4: Months 19-24 (Enterprise & Expansion)

| Service | Configuration | Monthly Cost |
|---------|---------------|-------------|
| EC2 (App) | 6x t3.large (ASG) | $300 |
| EC2 (GPU) | 5x g5.xlarge Spot | $1,500 |
| EC2 (GPU) | 3x g5.2xlarge Spot (LLM) | $1,050 |
| EC2 (GPU Fine-tune) | p4d.24xlarge (120 hrs) | $1,560 |
| SageMaker | Multi-model endpoints | $600 |
| RDS | db.r6g.large Multi-AZ | $350 |
| ElastiCache | cache.r6g.large cluster | $200 |
| S3 | 2 TB + Glacier | $50 |
| SES | 500,000 emails | $50 |
| Load Balancer | ALB + NLB + GWLB | $100 |
| CloudFront | 2 TB + Edge Functions | $150 |
| NAT Gateway | 2 (HA) | $70 |
| Data Transfer | 2 TB | $180 |
| CloudWatch | Enterprise | $100 |
| X-Ray + DevOps Guru | Full observability | $80 |
| Security Suite | Enterprise | $200 |
| DR + Backup | Full coverage | $150 |
| **Monthly Total** | | **$6,690** |
| **Phase 4 Total (6 months)** | | **$40,140** |

### 6.2 24-Month Total Cost Summary

| Phase | Duration | Monthly Cost | Phase Total |
|-------|----------|--------------|-------------|
| Phase 1 (Foundation) | 6 months | $1,500 | $9,000 |
| Phase 2 (Growth) | 6 months | $2,950 | $17,700 |
| Phase 3 (Scale) | 6 months | $4,815 | $28,890 |
| Phase 4 (Enterprise) | 6 months | $6,690 | $40,140 |
| **24-Month Total** | | | **$95,730** |

### 6.3 Cost Optimization Applied

| Optimization | Savings |
|--------------|---------|
| Spot Instances (GPU) | -$45,000 (70% on GPU) |
| Reserved Instances (App/DB) | -$8,000 (35% on steady-state) |
| S3 Lifecycle Policies | -$3,000 (60% on old data) |
| Right-sizing | -$5,000 (continuous optimization) |
| **Total Optimizations** | **-$61,000** |

### 6.4 Full Cost Without Optimization

| Scenario | 24-Month Cost |
|----------|---------------|
| Without any optimization | $156,730 |
| With Spot + Reserved | $95,730 |
| **Savings from optimization** | **$61,000 (39%)** |

### 6.5 Credit Coverage Analysis

| Metric | Value |
|--------|-------|
| **Credits Requested** | $200,000 |
| **Projected 24-Month Spend** | $95,730 |
| **Buffer for Growth/Scaling** | $104,270 |
| **Coverage** | 24+ months |
| **Runway Extension** | +12 months buffer |

---

## 7. AWS Credits Request

### 7.1 Credit Allocation Plan (24-Month Runway)

| Category | Purpose | Amount | Timeline |
|----------|---------|--------|----------|
| **GPU Compute (AI Inference)** | g5.xlarge/g5.2xlarge instances for LLM, TTS, STT | $80,000 | Months 1-24 |
| **GPU Compute (Training/Fine-tuning)** | p4d instances for model customization | $30,000 | Months 3-24 |
| **Application Infrastructure** | EC2, Auto Scaling, Load Balancers | $25,000 | Months 1-24 |
| **Database Services** | RDS PostgreSQL Multi-AZ, ElastiCache | $20,000 | Months 1-24 |
| **Storage & Data Transfer** | S3, CloudFront CDN, Data Transfer | $15,000 | Months 1-24 |
| **ML Platform Services** | SageMaker endpoints, experiments | $10,000 | Months 6-24 |
| **Security & Compliance** | WAF, Shield, GuardDuty, Security Hub | $8,000 | Months 1-24 |
| **Monitoring & Observability** | CloudWatch, X-Ray, Container Insights | $5,000 | Months 1-24 |
| **Disaster Recovery** | Cross-region replication, backups | $5,000 | Months 6-24 |
| **Buffer/Contingency** | Unexpected scaling, new features | $2,000 | As needed |
| **Total Request** | | **$200,000** | **24 months** |

### 7.2 Detailed GPU Compute Breakdown

| Workload | Instance Type | Hours/Month | Cost/Month | 24-Month Total |
|----------|---------------|-------------|------------|----------------|
| LLM Inference (Qwen) | g5.2xlarge Spot | 2,160 | $1,050 | $25,200 |
| STT Processing | g5.xlarge Spot | 1,440 | $590 | $14,160 |
| TTS Generation | g5.xlarge Spot | 1,440 | $590 | $14,160 |
| Model Fine-tuning | p4d.24xlarge Spot | 100 | $1,300 | $31,200 |
| Dev/Test GPU | g4dn.xlarge Spot | 720 | $150 | $3,600 |
| **Total GPU** | | | **$3,680** | **$88,320** |

### 7.3 Credit Utilization Timeline

```
Credits Usage Over 24 Months ($200,000 Total)
════════════════════════════════════════════════════════════════════════════════

Phase 1: Foundation (Months 1-6) - $40,000
─────────────────────────────────────────────────────────────────────────────────
│ Infrastructure Setup     ████████████ $15,000
│ Initial GPU Deployment   ████████████████ $20,000
│ Security & Monitoring    ████ $5,000
─────────────────────────────────────────────────────────────────────────────────

Phase 2: Growth (Months 7-12) - $60,000
─────────────────────────────────────────────────────────────────────────────────
│ Scaled GPU Compute       ████████████████████████ $35,000
│ Model Fine-tuning        ██████████ $15,000
│ Multi-AZ Database        ██████ $10,000
─────────────────────────────────────────────────────────────────────────────────

Phase 3: Scale (Months 13-18) - $55,000
─────────────────────────────────────────────────────────────────────────────────
│ High-Volume GPU          ████████████████████████████ $40,000
│ CDN & Edge Deployment    ████████ $10,000
│ DR & Compliance          ████ $5,000
─────────────────────────────────────────────────────────────────────────────────

Phase 4: Enterprise (Months 19-24) - $45,000
─────────────────────────────────────────────────────────────────────────────────
│ Enterprise GPU Scale     ████████████████████████ $35,000
│ Advanced ML Services     ██████ $7,000
│ Buffer/Contingency       ██ $3,000
─────────────────────────────────────────────────────────────────────────────────

Monthly Spend Projection:
Month  │ 1    3    6    9    12   15   18   21   24
───────┼─────────────────────────────────────────────────
Spend  │ $5K  $6K  $7K  $8K  $9K  $9K  $8K  $8K  $7K
Cumul. │ $5K  $17K $40K $64K $100K $127K $155K $179K $200K
```

### 7.4 Milestones & Deliverables

| Milestone | Timeline | AWS Services Used | Deliverable | Credits Used |
|-----------|----------|-------------------|-------------|--------------|
| Infrastructure Setup | Month 1-2 | VPC, EC2, RDS, S3, ALB | Production environment | $8,000 |
| AI Model Deployment | Month 2-3 | GPU EC2 (g5), S3 | Self-hosted Qwen, Whisper, XTTS | $12,000 |
| Auto-Scaling Implementation | Month 3-4 | ASG, ALB, CloudWatch | Scalable GPU architecture | $5,000 |
| Indian Language Models | Month 4-6 | p4d (fine-tuning), S3 | Hindi, Tamil, Telugu TTS/STT | $15,000 |
| 500 Active Organizations | Month 6 | Full stack | Business milestone | - |
| Multi-AZ High Availability | Month 6-8 | RDS Multi-AZ, ElastiCache | 99.9% uptime SLA | $10,000 |
| SageMaker Integration | Month 8-10 | SageMaker, ECR | ML pipeline automation | $12,000 |
| 1,000 Active Organizations | Month 12 | Scaled infrastructure | Business milestone | - |
| Enterprise Security | Month 10-14 | WAF, Shield, GuardDuty | SOC 2 readiness | $15,000 |
| Multi-Region DR | Month 14-16 | Cross-region, Route 53 | Disaster recovery | $18,000 |
| 2,000 Active Organizations | Month 18 | Full enterprise stack | Business milestone | - |
| Edge AI Deployment | Month 18-20 | CloudFront, Lambda@Edge | Global low-latency | $20,000 |
| Series A Readiness | Month 24 | Enterprise architecture | Investor-ready platform | - |

### 7.5 Key Performance Indicators (KPIs)

| KPI | Month 6 | Month 12 | Month 18 | Month 24 |
|-----|---------|----------|----------|----------|
| **Uptime SLA** | 99.5% | 99.9% | 99.95% | 99.99% |
| **API Latency (p99)** | <500ms | <300ms | <200ms | <150ms |
| **Voice AI Latency** | <400ms | <250ms | <200ms | <150ms |
| **Cost per 1K API Calls** | $0.10 | $0.07 | $0.05 | $0.03 |
| **GPU Utilization** | 60% | 75% | 85% | 90% |

---

## 8. Business Impact & ROI

### 8.1 Cost Savings from Self-Hosted AI

| Service | Third-Party Cost/Month | Self-Hosted Cost/Month | Monthly Savings | 24-Month Savings |
|---------|------------------------|------------------------|-----------------|------------------|
| LLM (OpenAI GPT-4) | $3,000 | $800 | $2,200 | $52,800 |
| STT (Deepgram) | $500 | $150 | $350 | $8,400 |
| TTS (ElevenLabs) | $800 | $150 | $650 | $15,600 |
| **Total** | **$4,300** | **$1,100** | **$3,200** | **$76,800** |

**Self-hosting ROI:** 74% cost reduction on AI services

### 8.2 Projected Growth Metrics (24 Months)

| Metric | Month 1 | Month 6 | Month 12 | Month 18 | Month 24 |
|--------|---------|---------|----------|----------|----------|
| Active Organizations | 50 | 200 | 500 | 1,000 | 2,000 |
| Monthly Voice Minutes | 10,000 | 100,000 | 500,000 | 1,500,000 | 3,000,000 |
| Monthly API Calls | 100,000 | 1,000,000 | 5,000,000 | 15,000,000 | 30,000,000 |
| MRR (Monthly Revenue) | $5,000 | $30,000 | $100,000 | $250,000 | $500,000 |
| ARR (Annual Run Rate) | $60,000 | $360,000 | $1,200,000 | $3,000,000 | $6,000,000 |

### 8.3 Return on AWS Investment

| Metric | Value |
|--------|-------|
| **AWS Credits Requested** | $200,000 |
| **Projected 24-Month Revenue** | $4,500,000 |
| **AWS Spend (Covered by Credits)** | $95,730 |
| **Remaining Credits (Buffer)** | $104,270 |
| **Revenue per $1 AWS Credit** | $22.50 |
| **Post-Credit AWS Spend (Year 3+)** | $80,000+/year |
| **Customer LTV Impact** | 4x improvement |

### 8.4 Investment Justification

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    AWS Credits ROI Analysis                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Credits Invested: $200,000                                             │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  DIRECT RETURNS                                                          │
│  ├─ AI Cost Savings (vs Third-Party)      $76,800  (24 months)          │
│  ├─ Infrastructure Savings (Spot/RI)      $61,000  (24 months)          │
│  └─ Development Acceleration              $50,000  (estimated)          │
│                                           ─────────                      │
│                                           $187,800                       │
│                                                                          │
│  BUSINESS IMPACT                                                         │
│  ├─ Revenue Generated                     $4,500,000                    │
│  ├─ Customers Acquired                    2,000 organizations           │
│  ├─ Jobs Created                          15-20 employees               │
│  └─ Market Position                       #1 in India SMB segment       │
│                                                                          │
│  AWS ECOSYSTEM GROWTH                                                    │
│  ├─ Post-Credit Annual Spend              $80,000+                      │
│  ├─ Customer AWS Referrals                50+ organizations             │
│  └─ Case Study Potential                  AI/ML on AWS success story    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.5 Competitive Advantage with AWS

| Capability | Impact |
|------------|--------|
| **GPU Spot Instances** | 70% lower AI costs than competitors |
| **ap-south-1 Region** | <50ms latency for 500M+ Indian users |
| **SageMaker Integration** | Faster model iteration & deployment |
| **AWS Marketplace** | Future distribution channel |
| **Enterprise Credibility** | "Built on AWS" trust factor |

---

## 9. Technical Differentiators

### 9.1 Why AWS?

| Capability | AWS Advantage |
|------------|---------------|
| **GPU Availability** | Consistent g5/p4 instance availability in Mumbai |
| **Spot Instances** | 70% cost savings for AI workloads |
| **Regional Latency** | <50ms latency for Indian users |
| **Compliance** | Data residency in India (MEITY compliance) |
| **Integration** | Native SES, SNS, SQS integration |
| **Scalability** | Auto-scaling for variable AI workloads |

### 9.2 Competitive Architecture Advantages

| Feature | Our Approach | Traditional Approach |
|---------|--------------|---------------------|
| AI Inference | Self-hosted on GPU Spot | Third-party APIs |
| Cost per 1000 requests | $0.05 | $0.50-2.00 |
| Latency | <200ms | 500ms-2s |
| Data Privacy | On-premises processing | Data sent to third parties |
| Customization | Full model fine-tuning | Limited/None |
| Languages | Custom Indian language models | English-focused |

---

## 10. Security & Compliance

### 10.1 Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: Edge Security                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  AWS WAF │ AWS Shield │ CloudFront │ Route 53      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Layer 2: Network Security                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  VPC │ Security Groups │ NACLs │ Private Subnets   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Layer 3: Application Security                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  JWT Auth │ RBAC │ API Rate Limiting │ CSRF/XSS    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Layer 4: Data Security                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  RDS Encryption │ S3 Encryption │ Secrets Manager  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 Compliance Readiness

| Standard | Status | AWS Services Used |
|----------|--------|-------------------|
| **SOC 2 Type II** | Roadmap | CloudTrail, Config, Security Hub |
| **ISO 27001** | Roadmap | AWS Artifact, KMS |
| **GDPR** | Compliant | Data residency, encryption |
| **India DPDP Act** | Compliant | ap-south-1 region, local storage |

---

## 11. Team & Support Requirements

### 11.1 Technical Team

| Role | Responsibility |
|------|----------------|
| **DevOps Engineer** | AWS infrastructure, CI/CD, monitoring |
| **ML Engineer** | Model optimization, deployment, fine-tuning |
| **Backend Developer** | API development, integrations |
| **Frontend Developer** | User interface, dashboards |

### 11.2 AWS Support Request

| Support Type | Purpose | Engagement |
|--------------|---------|------------|
| **Technical Account Manager** | Architecture review, best practices | Quarterly reviews |
| **Solutions Architect** | GPU optimization, cost optimization | Monthly check-ins |
| **ML Specialist** | SageMaker, Inferentia, model optimization | As needed |
| **Startup Solutions Architect** | Startup-specific guidance | Dedicated support |
| **AWS Activate Team** | Credits management, program benefits | Ongoing |
| **Partner Development** | AWS Marketplace listing | Month 12+ |

### 11.3 Why $200,000 Credits?

| Justification | Details |
|---------------|---------|
| **GPU-Intensive Workload** | Self-hosted AI requires continuous GPU compute ($3,500+/month) |
| **Model Fine-tuning** | Custom Indian language models need p4d instances ($1,300/month) |
| **24-Month Runway** | Sufficient runway to reach profitability without infrastructure constraints |
| **Scaling Buffer** | Handle 10x traffic spikes during customer acquisition |
| **Enterprise Readiness** | Multi-AZ, DR, security compliance requires investment |
| **Competitive Edge** | Outpace competitors locked into expensive third-party APIs |

### 11.4 Strategic Value to AWS

| Value | Description |
|-------|-------------|
| **AI/ML Showcase** | Demonstrate GPU Spot + self-hosted models success story |
| **India Market** | Reference customer for AWS India startup ecosystem |
| **Long-term Customer** | Projected $80K+/year post-credit spend |
| **Ecosystem Growth** | 2,000+ SMBs introduced to AWS through our platform |
| **Case Study** | "Startup reduces AI costs 74% with AWS" narrative |
| **Marketplace Revenue** | Future AWS Marketplace SaaS listing |

---

## 12. Appendix

### A. Environment Variables (AWS-Related)

```bash
# AWS Core
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=<via-iam-role>
AWS_SECRET_ACCESS_KEY=<via-iam-role>

# S3 Configuration
AWS_BUCKET_NAME=myleadx-uploads
AWS_RECORDINGS_BUCKET=myleadx-recordings
AWS_MODELS_BUCKET=myleadx-ml-models

# SES Configuration
AWS_SES_REGION=ap-south-1
AWS_SES_FROM_EMAIL=noreply@myleadx.ai
AWS_SES_FROM_NAME=MyLeadX

# RDS Configuration
DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/myleadx

# ElastiCache
REDIS_URL=redis://elasticache-endpoint:6379
```

### B. Terraform Modules Used

```
terraform/
├── main.tf              # Core infrastructure
├── variables.tf         # Configuration variables
├── outputs.tf           # Output values
├── modules/
│   ├── vpc/            # VPC configuration
│   ├── ec2/            # EC2 instances
│   ├── rds/            # Database
│   ├── s3/             # Storage buckets
│   ├── gpu/            # GPU instances for AI
│   └── monitoring/     # CloudWatch setup
```

### C. Cost Optimization Strategies

1. **Spot Instances** - 70% savings on GPU compute
2. **Reserved Instances** - 42% savings on steady-state workloads
3. **S3 Lifecycle Policies** - 60% savings on storage
4. **Auto Scaling** - Right-size based on demand
5. **Graviton Instances** - 20% savings for non-GPU workloads

### D. Contact Information

| Contact | Details |
|---------|---------|
| **Company** | MyLeadX |
| **Website** | https://myleadx.ai |
| **Contact** | Kishore (CEO & Founder) |
| **Email** | kishore@myleadx.ai |
| **Phone** | +91-9876543210 |
| **Location** | Hyderabad, India |

---

## Document Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| **CEO & Founder** | Kishore | May 2026 | _____________ |
| **CTO** | | | _____________ |
| **AWS Contact** | | | _____________ |

---

*This document is confidential and intended for AWS partnership evaluation purposes only.*
