
<div align="center">

# AWS Partnership Proposal

![AWS](https://img.shields.io/badge/AWS-Partner_Request-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white)
![Credits](https://img.shields.io/badge/Credits_Requested-$200,000-success?style=for-the-badge)
![Duration](https://img.shields.io/badge/Duration-24_Months-blue?style=for-the-badge)

---

## **MyLeadX**
### *AI-Powered Sales & Communication Platform*

---

**Document Version:** 1.0 | **Date:** May 2026 | **Confidential**

**Prepared by:** Kishore, CEO | **Email:** kishore@myleadx.ai | **Phone:** +91-9876543210

</div>

---

<br>

## Table of Contents

| # | Section | Description |
|---|---------|-------------|
| 1 | [Executive Summary](#1-executive-summary) | Company overview & credit request |
| 2 | [Company Overview](#2-company-overview) | Problem, solution & market |
| 3 | [Technical Architecture](#3-technical-architecture) | Current & proposed infrastructure |
| 4 | [GPU Infrastructure](#4-gpu-infrastructure-requirements) | Hardware requirements |
| 5 | [AI/ML Models](#5-aiml-models) | LLM, TTS, STT specifications |
| 6 | [AWS Services](#6-aws-services-utilization) | Complete service breakdown |
| 7 | [Cost Projections](#7-24-month-cost-projection) | Detailed financial planning |
| 8 | [Credits Request](#8-aws-credits-request) | $200K allocation plan |
| 9 | [ROI & Impact](#9-business-impact--roi) | Return on investment |
| 10 | [Security](#10-security--compliance) | Architecture & compliance |

---

<br>

# 1. Executive Summary

<table>
<tr>
<td width="50%">

### Company Snapshot

| Attribute | Details |
|-----------|---------|
| **Company** | MyLeadX |
| **Industry** | B2B SaaS / AI |
| **Founded** | 2024 |
| **Headquarters** | India |
| **Website** | myleadx.ai |

</td>
<td width="50%">

### AWS Request

| Attribute | Details |
|-----------|---------|
| **Credits Requested** | **$200,000** |
| **Duration** | 24 Months |
| **Primary Region** | ap-south-1 (Mumbai) |
| **Primary Use** | GPU Compute for AI |
| **Program** | AWS Activate |

</td>
</tr>
</table>

### The Opportunity

> *MyLeadX is building India's leading AI-powered sales platform, enabling 10,000+ SMBs to automate customer communication through voice AI, WhatsApp, SMS, and email - all powered by self-hosted ML models on AWS infrastructure.*

### Key Metrics

<table>
<tr>
<td align="center" width="25%">
<h3>2,000</h3>
<sub>Target Organizations<br>(24 months)</sub>
</td>
<td align="center" width="25%">
<h3>$6M</h3>
<sub>Projected ARR<br>(Year 2)</sub>
</td>
<td align="center" width="25%">
<h3>74%</h3>
<sub>AI Cost Savings<br>(vs Third-Party)</sub>
</td>
<td align="center" width="25%">
<h3>$80K+</h3>
<sub>Post-Credit AWS Spend<br>(Annual)</sub>
</td>
</tr>
</table>

---

<br>

# 2. Company Overview

## 2.1 The Problem

<table>
<tr>
<td width="50%">

### Challenges SMBs Face

- High cost of sales team management
- Inefficient lead follow-up (avg 48hr response time)
- Expensive third-party AI services ($0.50+/API call)
- Limited access to enterprise CRM tools
- English-only AI solutions in multilingual markets

</td>
<td width="50%">

### Market Pain Points

- **$15B** spent annually on manual telecalling in India
- **60%** of leads lost due to slow follow-up
- **90%** of SMBs can't afford enterprise AI tools
- **500M+** non-English speakers underserved
- **3x** cost for third-party voice AI services

</td>
</tr>
</table>

## 2.2 Our Solution

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                           MyLeadX Platform                                  │
│                                                                             │
│    ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   │
│    │             │   │             │   │             │   │             │   │
│    │   Voice AI  │   │  WhatsApp   │   │    SMS      │   │   Email     │   │
│    │   Agents    │   │  Business   │   │  Campaigns  │   │  Sequences  │   │
│    │             │   │             │   │             │   │             │   │
│    └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   │
│           │                 │                 │                 │           │
│           └─────────────────┴─────────────────┴─────────────────┘           │
│                                     │                                       │
│                          ┌──────────▼──────────┐                           │
│                          │                     │                           │
│                          │   Unified CRM &     │                           │
│                          │   Lead Management   │                           │
│                          │                     │                           │
│                          └──────────┬──────────┘                           │
│                                     │                                       │
│           ┌─────────────────────────┼─────────────────────────┐            │
│           │                         │                         │            │
│    ┌──────▼──────┐           ┌──────▼──────┐           ┌──────▼──────┐    │
│    │   Self-     │           │   Indian    │           │  Analytics  │    │
│    │   Hosted    │           │   Language  │           │     &       │    │
│    │   AI/ML     │           │   Support   │           │  Reporting  │    │
│    └─────────────┘           └─────────────┘           └─────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2.3 Competitive Advantage

| Feature | MyLeadX | Competitors |
|---------|:-------:|:-----------:|
| Self-Hosted AI Models | ✅ | ❌ |
| Indian Language Support (10+) | ✅ | Limited |
| Voice AI Latency | <200ms | 500ms+ |
| Cost per 1000 API calls | $0.05 | $0.50-2.00 |
| SMB-Friendly Pricing | ✅ | ❌ |
| WhatsApp Native Integration | ✅ | Add-on |
| On-Premise Data Processing | ✅ | ❌ |

---

<br>

# 3. Technical Architecture

## 3.1 Current Production Architecture

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                          AWS CLOUD (ap-south-1)                                ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║   ┌─────────────────────────────────────────────────────────────────────┐     ║
║   │                        VPC (10.0.0.0/16)                            │     ║
║   │                                                                      │     ║
║   │   ┌─────────────────────────────────────────────────────────────┐   │     ║
║   │   │              PUBLIC SUBNET (10.0.1.0/24)                     │   │     ║
║   │   │                                                              │   │     ║
║   │   │    ┌──────────────────────────────────────────────────┐     │   │     ║
║   │   │    │              EC2 (t3.medium)                      │     │   │     ║
║   │   │    │                                                   │     │   │     ║
║   │   │    │   ┌─────────────┐      ┌─────────────┐           │     │   │     ║
║   │   │    │   │  Frontend   │      │  Backend    │           │     │   │     ║
║   │   │    │   │  (React)    │      │  (Node.js)  │           │     │   │     ║
║   │   │    │   │  Port 3000  │      │  Port 8080  │           │     │   │     ║
║   │   │    │   └─────────────┘      └─────────────┘           │     │   │     ║
║   │   │    │                                                   │     │   │     ║
║   │   │    │   ┌───────────────────────────────────────────┐  │     │   │     ║
║   │   │    │   │        Nginx + SSL (Let's Encrypt)        │  │     │   │     ║
║   │   │    │   └───────────────────────────────────────────┘  │     │   │     ║
║   │   │    └──────────────────────────────────────────────────┘     │   │     ║
║   │   │                            │                                 │   │     ║
║   │   │                     [ Elastic IP ]                          │   │     ║
║   │   └────────────────────────────┼────────────────────────────────┘   │     ║
║   │                                │                                     │     ║
║   │   ┌────────────────────────────┼────────────────────────────────┐   │     ║
║   │   │         PRIVATE SUBNETS (10.0.2.0/24, 10.0.3.0/24)          │   │     ║
║   │   │                            │                                 │   │     ║
║   │   │                 ┌──────────▼──────────┐                     │   │     ║
║   │   │                 │  RDS PostgreSQL     │                     │   │     ║
║   │   │                 │  (db.t3.micro)      │                     │   │     ║
║   │   │                 └─────────────────────┘                     │   │     ║
║   │   └─────────────────────────────────────────────────────────────┘   │     ║
║   └─────────────────────────────────────────────────────────────────────┘     ║
║                                                                                ║
║   ┌────────────────────────────┐    ┌────────────────────────────┐            ║
║   │         S3 STORAGE         │    │           SES              │            ║
║   │  • Uploads Bucket          │    │  • Transactional Email     │            ║
║   │  • Recordings Bucket       │    │  • Campaign Email          │            ║
║   └────────────────────────────┘    └────────────────────────────┘            ║
║                                                                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

## 3.2 Proposed Architecture (With Self-Hosted AI)

```
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                            AWS CLOUD (ap-south-1)                                  ║
║                         PRODUCTION ARCHITECTURE v2.0                               ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                    ║
║  ╔═══════════════════════════════════════════════════════════════════════════╗   ║
║  ║                              EDGE LAYER                                    ║   ║
║  ║   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐           ║   ║
║  ║   │Route 53  │───▶│CloudFront│───▶│   WAF    │───▶│  Shield  │           ║   ║
║  ║   │   DNS    │    │   CDN    │    │ Firewall │    │   DDoS   │           ║   ║
║  ║   └──────────┘    └──────────┘    └──────────┘    └──────────┘           ║   ║
║  ╚═══════════════════════════════════════════════════════════════════════════╝   ║
║                                        │                                          ║
║                                        ▼                                          ║
║  ╔═══════════════════════════════════════════════════════════════════════════╗   ║
║  ║                          APPLICATION LAYER                                 ║   ║
║  ║                                                                            ║   ║
║  ║   ┌────────────────────────────────────────────────────────────────────┐  ║   ║
║  ║   │              APPLICATION LOAD BALANCER (ALB)                        │  ║   ║
║  ║   │              • SSL Termination (ACM)                                │  ║   ║
║  ║   │              • Path-based Routing                                   │  ║   ║
║  ║   └─────────────────────────────┬──────────────────────────────────────┘  ║   ║
║  ║                                 │                                          ║   ║
║  ║        ┌────────────────────────┼────────────────────────┐                ║   ║
║  ║        ▼                        ▼                        ▼                ║   ║
║  ║   ┌─────────┐             ┌─────────┐             ┌─────────┐            ║   ║
║  ║   │  EC2    │             │  EC2    │             │  EC2    │            ║   ║
║  ║   │t3.medium│             │t3.medium│             │t3.medium│            ║   ║
║  ║   │  App 1  │             │  App 2  │             │  App 3  │            ║   ║
║  ║   └─────────┘             └─────────┘             └─────────┘            ║   ║
║  ║                                                                            ║   ║
║  ║                    [ AUTO SCALING GROUP: Min 2, Max 5 ]                   ║   ║
║  ╚═══════════════════════════════════════════════════════════════════════════╝   ║
║                                        │                                          ║
║                                        ▼                                          ║
║  ╔═══════════════════════════════════════════════════════════════════════════╗   ║
║  ║                         🤖 AI INFERENCE LAYER                              ║   ║
║  ║                                                                            ║   ║
║  ║   ┌────────────────────────────────────────────────────────────────────┐  ║   ║
║  ║   │              INTERNAL LOAD BALANCER (NLB)                           │  ║   ║
║  ║   └─────────────────────────────┬──────────────────────────────────────┘  ║   ║
║  ║                                 │                                          ║   ║
║  ║        ┌────────────────────────┼────────────────────────┐                ║   ║
║  ║        ▼                        ▼                        ▼                ║   ║
║  ║   ┌──────────┐            ┌──────────┐            ┌──────────┐           ║   ║
║  ║   │ g5.xlarge│            │ g5.xlarge│            │g5.2xlarge│           ║   ║
║  ║   │  NVIDIA  │            │  NVIDIA  │            │  NVIDIA  │           ║   ║
║  ║   │  A10G    │            │  A10G    │            │  A10G    │           ║   ║
║  ║   │          │            │          │            │          │           ║   ║
║  ║   │┌────────┐│            │┌────────┐│            │┌────────┐│           ║   ║
║  ║   ││Whisper ││            ││XTTS-v2 ││            ││Qwen2.5 ││           ║   ║
║  ║   ││  STT   ││            ││  TTS   ││            ││  LLM   ││           ║   ║
║  ║   │└────────┘│            │└────────┘│            │└────────┘│           ║   ║
║  ║   └──────────┘            └──────────┘            └──────────┘           ║   ║
║  ║                                                                            ║   ║
║  ║                   [ GPU AUTO SCALING GROUP: Min 1, Max 5 ]                ║   ║
║  ║                            [ SPOT INSTANCES ]                              ║   ║
║  ╚═══════════════════════════════════════════════════════════════════════════╝   ║
║                                        │                                          ║
║                                        ▼                                          ║
║  ╔═══════════════════════════════════════════════════════════════════════════╗   ║
║  ║                           DATA LAYER                                       ║   ║
║  ║                                                                            ║   ║
║  ║   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐       ║   ║
║  ║   │ RDS PostgreSQL  │    │  ElastiCache    │    │   S3 Storage    │       ║   ║
║  ║   │ (db.t3.medium)  │    │    (Redis)      │    │                 │       ║   ║
║  ║   │                 │    │                 │    │ • Uploads       │       ║   ║
║  ║   │  • Multi-AZ     │    │  • Sessions     │    │ • Recordings    │       ║   ║
║  ║   │  • Encrypted    │    │  • Cache        │    │ • ML Models     │       ║   ║
║  ║   │  • Auto-backup  │    │  • Queues       │    │ • Lifecycle     │       ║   ║
║  ║   └─────────────────┘    └─────────────────┘    └─────────────────┘       ║   ║
║  ╚═══════════════════════════════════════════════════════════════════════════╝   ║
║                                                                                    ║
║  ╔═══════════════════════════════════════════════════════════════════════════╗   ║
║  ║                        SUPPORTING SERVICES                                 ║   ║
║  ║                                                                            ║   ║
║  ║   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐             ║   ║
║  ║   │  SES   │  │  SNS   │  │  SQS   │  │CloudW. │  │Secrets │             ║   ║
║  ║   │ Email  │  │ Notify │  │ Queue  │  │  Logs  │  │Manager │             ║   ║
║  ║   └────────┘  └────────┘  └────────┘  └────────┘  └────────┘             ║   ║
║  ╚═══════════════════════════════════════════════════════════════════════════╝   ║
║                                                                                    ║
╚════════════════════════════════════════════════════════════════════════════════════╝
```

---

<br>

# 4. GPU Infrastructure Requirements

## 4.1 GPU Instance Selection

<table>
<tr>
<th>Instance</th>
<th>GPU</th>
<th>VRAM</th>
<th>vCPUs</th>
<th>RAM</th>
<th>Use Case</th>
<th>Spot $/hr</th>
</tr>
<tr>
<td><code>g4dn.xlarge</code></td>
<td>NVIDIA T4</td>
<td>16 GB</td>
<td>4</td>
<td>16 GB</td>
<td>Dev/Test</td>
<td align="right">$0.21</td>
</tr>
<tr>
<td><code>g5.xlarge</code></td>
<td>NVIDIA A10G</td>
<td>24 GB</td>
<td>4</td>
<td>16 GB</td>
<td>STT/TTS Production</td>
<td align="right">$0.41</td>
</tr>
<tr>
<td><code>g5.2xlarge</code></td>
<td>NVIDIA A10G</td>
<td>24 GB</td>
<td>8</td>
<td>32 GB</td>
<td>LLM Inference</td>
<td align="right">$0.49</td>
</tr>
<tr>
<td><code>g5.4xlarge</code></td>
<td>NVIDIA A10G</td>
<td>24 GB</td>
<td>16</td>
<td>64 GB</td>
<td>High-throughput</td>
<td align="right">$0.82</td>
</tr>
<tr>
<td><code>p4d.24xlarge</code></td>
<td>8× NVIDIA A100</td>
<td>320 GB</td>
<td>96</td>
<td>1152 GB</td>
<td>Model Fine-tuning</td>
<td align="right">$13.00</td>
</tr>
</table>

## 4.2 GPU Allocation Matrix

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                           GPU ALLOCATION MATRIX                                   ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                   ║
║  WORKLOAD                 │ GPU INSTANCE        │ QTY │ HRS/MO  │ COST/MO       ║
║  ═════════════════════════╪═════════════════════╪═════╪═════════╪═══════════════║
║                           │                     │     │         │               ║
║  🧠 LLM Inference         │ g5.2xlarge          │  2  │  1,440  │    $1,050     ║
║     (Qwen2.5-7B)          │ (NVIDIA A10G 24GB)  │     │         │               ║
║  ─────────────────────────┼─────────────────────┼─────┼─────────┼───────────────║
║                           │                     │     │         │               ║
║  🎤 Speech-to-Text        │ g5.xlarge           │  2  │  1,440  │    $590       ║
║     (Faster-Whisper)      │ (NVIDIA A10G 24GB)  │     │         │               ║
║  ─────────────────────────┼─────────────────────┼─────┼─────────┼───────────────║
║                           │                     │     │         │               ║
║  🔊 Text-to-Speech        │ g5.xlarge           │  2  │  1,440  │    $590       ║
║     (XTTS-v2)             │ (NVIDIA A10G 24GB)  │     │         │               ║
║  ─────────────────────────┼─────────────────────┼─────┼─────────┼───────────────║
║                           │                     │     │         │               ║
║  🔧 Model Fine-tuning     │ p4d.24xlarge        │  1  │   100   │    $1,300     ║
║     (Indian Languages)    │ (8× NVIDIA A100)    │     │         │               ║
║  ─────────────────────────┼─────────────────────┼─────┼─────────┼───────────────║
║                           │                     │     │         │               ║
║  💻 Development/Testing   │ g4dn.xlarge         │  1  │   720   │    $150       ║
║                           │ (NVIDIA T4 16GB)    │     │         │               ║
║  ═════════════════════════╧═════════════════════╧═════╧═════════╧═══════════════║
║                                                                                   ║
║  📊 TOTAL MONTHLY GPU COST (SPOT PRICING)                          $3,680        ║
║  📊 TOTAL 24-MONTH GPU COST                                        $88,320       ║
║                                                                                   ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

## 4.3 GPU Memory Layout

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃               PRODUCTION GPU MEMORY LAYOUT (g5.2xlarge)                         ┃
┃                        NVIDIA A10G - 24GB VRAM                                  ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                                  ┃
┃   ┌─────────────────────────────────────────────────────────────────────┐       ┃
┃   │  🧠 Qwen2.5-7B-Instruct (4-bit GGUF)                    │  6 GB    │       ┃
┃   │     ├─ Model weights ................................   │  4.5 GB  │       ┃
┃   │     ├─ KV Cache (context) ...........................   │  1.0 GB  │       ┃
┃   │     └─ Inference buffer .............................   │  0.5 GB  │       ┃
┃   └─────────────────────────────────────────────────────────────────────┘       ┃
┃                                                                                  ┃
┃   ┌─────────────────────────────────────────────────────────────────────┐       ┃
┃   │  🎤 Faster-Whisper Large-v3                             │  6 GB    │       ┃
┃   │     ├─ Model weights (CTranslate2) ......................│  3.0 GB  │       ┃
┃   │     ├─ Audio processing buffer .........................│  2.0 GB  │       ┃
┃   │     └─ Beam search cache ...............................│  1.0 GB  │       ┃
┃   └─────────────────────────────────────────────────────────────────────┘       ┃
┃                                                                                  ┃
┃   ┌─────────────────────────────────────────────────────────────────────┐       ┃
┃   │  🔊 XTTS-v2 (Coqui TTS)                                 │  5 GB    │       ┃
┃   │     ├─ GPT-2 backbone ..................................│  2.0 GB  │       ┃
┃   │     ├─ HiFi-GAN vocoder ................................│  1.5 GB  │       ┃
┃   │     ├─ Speaker encoder .................................│  0.5 GB  │       ┃
┃   │     └─ Generation buffer ...............................│  1.0 GB  │       ┃
┃   └─────────────────────────────────────────────────────────────────────┘       ┃
┃                                                                                  ┃
┃   ┌─────────────────────────────────────────────────────────────────────┐       ┃
┃   │  ⚙️  CUDA Runtime & Overhead                             │  3 GB    │       ┃
┃   └─────────────────────────────────────────────────────────────────────┘       ┃
┃                                                                                  ┃
┃   ┌─────────────────────────────────────────────────────────────────────┐       ┃
┃   │  📦 Available Headroom                                  │  4 GB    │       ┃
┃   └─────────────────────────────────────────────────────────────────────┘       ┃
┃                                                                                  ┃
┃   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ┃
┃   TOTAL UTILIZED: 20 GB / 24 GB (83%)  ✅ Optimal                               ┃
┃                                                                                  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## 4.4 GPU Scaling Roadmap

| Phase | Timeline | LLM (g5.2xl) | STT (g5.xl) | TTS (g5.xl) | Fine-tune (p4d) |
|-------|----------|:------------:|:-----------:|:-----------:|:---------------:|
| **Phase 1** | Months 1-6 | 1 | 1 | 1 | 50 hrs/mo |
| **Phase 2** | Months 7-12 | 2 | 2 | 2 | 80 hrs/mo |
| **Phase 3** | Months 13-18 | 3 | 3 | 2 | 100 hrs/mo |
| **Phase 4** | Months 19-24 | 4 | 3 | 3 | 120 hrs/mo |

---

<br>

# 5. AI/ML Models

## 5.1 Model Specifications

<table>
<tr>
<th width="33%">🧠 Large Language Model</th>
<th width="33%">🎤 Speech-to-Text</th>
<th width="33%">🔊 Text-to-Speech</th>
</tr>
<tr>
<td>

**Qwen2.5-7B-Instruct**

| Spec | Value |
|------|-------|
| Parameters | 7B |
| Quantization | 4-bit GGUF |
| Model Size | 4.5 GB |
| VRAM | 6-8 GB |
| Framework | vLLM |
| Tokens/sec | 50-80 |
| Languages | 10+ |

</td>
<td>

**Faster-Whisper Large-v3**

| Spec | Value |
|------|-------|
| Parameters | 1.5B |
| Format | CTranslate2 |
| Model Size | 3 GB |
| VRAM | 6-8 GB |
| Framework | faster-whisper |
| Speed | 10-15x RT |
| Languages | 100+ |

</td>
<td>

**XTTS-v2 (Coqui)**

| Spec | Value |
|------|-------|
| Architecture | GPT-2 + HiFi-GAN |
| Model Size | 2 GB |
| VRAM | 4-6 GB |
| Framework | Coqui TTS |
| Latency | ~200ms |
| Languages | 17 |
| Voice Clone | ✅ 3-sec |

</td>
</tr>
</table>

## 5.2 Supported Languages

| Language | STT | TTS | LLM | Priority |
|----------|:---:|:---:|:---:|:--------:|
| English | ✅ | ✅ | ✅ | P0 |
| Hindi | ✅ | ✅ | ✅ | P0 |
| Tamil | ✅ | ✅ | ✅ | P1 |
| Telugu | ✅ | ✅ | ✅ | P1 |
| Kannada | ✅ | ✅ | ✅ | P1 |
| Bengali | ✅ | ✅ | ✅ | P1 |
| Marathi | ✅ | ✅ | ✅ | P2 |
| Gujarati | ✅ | ✅ | ✅ | P2 |

---

<br>

# 6. AWS Services Utilization

## 6.1 Complete Service Matrix

<table>
<tr>
<th colspan="4">🖥️ COMPUTE SERVICES</th>
</tr>
<tr>
<td><b>Service</b></td>
<td><b>Configuration</b></td>
<td><b>Purpose</b></td>
<td><b>Monthly Units</b></td>
</tr>
<tr>
<td>EC2 (Application)</td>
<td>t3.medium × 3</td>
<td>App servers (ASG)</td>
<td>2,160 hours</td>
</tr>
<tr>
<td>EC2 (GPU - Inference)</td>
<td>g5.xlarge/2xlarge Spot</td>
<td>AI model inference</td>
<td>4,320 hours</td>
</tr>
<tr>
<td>EC2 (GPU - Training)</td>
<td>p4d.24xlarge Spot</td>
<td>Model fine-tuning</td>
<td>100 hours</td>
</tr>
<tr>
<td>Auto Scaling</td>
<td>Dynamic policies</td>
<td>Traffic management</td>
<td>Variable</td>
</tr>
<tr>
<td>Elastic Load Balancer</td>
<td>ALB + NLB</td>
<td>Traffic distribution</td>
<td>2 LBs</td>
</tr>
</table>

<table>
<tr>
<th colspan="4">💾 DATABASE & STORAGE</th>
</tr>
<tr>
<td><b>Service</b></td>
<td><b>Configuration</b></td>
<td><b>Purpose</b></td>
<td><b>Capacity</b></td>
</tr>
<tr>
<td>RDS PostgreSQL</td>
<td>db.t3.medium Multi-AZ</td>
<td>Primary database</td>
<td>100 GB</td>
</tr>
<tr>
<td>ElastiCache Redis</td>
<td>cache.t3.small</td>
<td>Sessions/Cache</td>
<td>2 nodes</td>
</tr>
<tr>
<td>S3 Standard</td>
<td>Intelligent-Tiering</td>
<td>Uploads, Models</td>
<td>200 GB</td>
</tr>
<tr>
<td>S3 (Recordings)</td>
<td>Lifecycle policies</td>
<td>Call recordings</td>
<td>1 TB</td>
</tr>
</table>

<table>
<tr>
<th colspan="4">🔒 SECURITY & NETWORKING</th>
</tr>
<tr>
<td><b>Service</b></td>
<td><b>Configuration</b></td>
<td><b>Purpose</b></td>
</tr>
<tr>
<td>VPC</td>
<td>Custom (10.0.0.0/16)</td>
<td>Network isolation</td>
</tr>
<tr>
<td>AWS WAF</td>
<td>Managed rules</td>
<td>Web application firewall</td>
</tr>
<tr>
<td>AWS Shield</td>
<td>Standard</td>
<td>DDoS protection</td>
</tr>
<tr>
<td>GuardDuty</td>
<td>Enabled</td>
<td>Threat detection</td>
</tr>
<tr>
<td>Secrets Manager</td>
<td>20 secrets</td>
<td>API keys, credentials</td>
</tr>
<tr>
<td>ACM</td>
<td>SSL certificates</td>
<td>HTTPS encryption</td>
</tr>
</table>

<table>
<tr>
<th colspan="4">📧 MESSAGING & MONITORING</th>
</tr>
<tr>
<td><b>Service</b></td>
<td><b>Configuration</b></td>
<td><b>Purpose</b></td>
<td><b>Monthly Volume</b></td>
</tr>
<tr>
<td>SES</td>
<td>Production</td>
<td>Transactional email</td>
<td>100K emails</td>
</tr>
<tr>
<td>SNS</td>
<td>Standard topics</td>
<td>Notifications</td>
<td>50K publishes</td>
</tr>
<tr>
<td>SQS</td>
<td>Standard queues</td>
<td>Async processing</td>
<td>100K requests</td>
</tr>
<tr>
<td>CloudWatch</td>
<td>Logs + Metrics + Alarms</td>
<td>Observability</td>
<td>Full stack</td>
</tr>
<tr>
<td>X-Ray</td>
<td>Tracing enabled</td>
<td>Performance analysis</td>
<td>100% sampling</td>
</tr>
</table>

---

<br>

# 7. 24-Month Cost Projection

## 7.1 Phase-wise Cost Breakdown

<table>
<tr>
<th colspan="5" align="center">📊 PHASE 1: FOUNDATION (Months 1-6)</th>
</tr>
<tr>
<th>Service</th>
<th>Configuration</th>
<th>Unit Cost</th>
<th>Units</th>
<th>Monthly</th>
</tr>
<tr><td>EC2 (App)</td><td>2× t3.medium</td><td>$0.05/hr</td><td>1,440 hrs</td><td>$70</td></tr>
<tr><td>EC2 (GPU)</td><td>2× g5.xlarge Spot</td><td>$0.41/hr</td><td>1,440 hrs</td><td>$600</td></tr>
<tr><td>EC2 (Fine-tune)</td><td>p4d.24xlarge Spot</td><td>$13/hr</td><td>50 hrs</td><td>$650</td></tr>
<tr><td>RDS</td><td>db.t3.small</td><td>$0.04/hr</td><td>730 hrs</td><td>$30</td></tr>
<tr><td>ElastiCache</td><td>cache.t3.micro</td><td>$0.02/hr</td><td>730 hrs</td><td>$15</td></tr>
<tr><td>S3</td><td>200 GB</td><td>$0.025/GB</td><td>200 GB</td><td>$10</td></tr>
<tr><td>Other Services</td><td>SES, ALB, CloudWatch</td><td>-</td><td>-</td><td>$125</td></tr>
<tr style="background-color: #f0f0f0;">
<td colspan="4"><b>MONTHLY TOTAL</b></td>
<td><b>$1,500</b></td>
</tr>
<tr style="background-color: #e0e0e0;">
<td colspan="4"><b>PHASE 1 TOTAL (6 months)</b></td>
<td><b>$9,000</b></td>
</tr>
</table>

<br>

<table>
<tr>
<th colspan="5" align="center">📊 PHASE 2: GROWTH (Months 7-12)</th>
</tr>
<tr>
<th>Service</th>
<th>Configuration</th>
<th>Unit Cost</th>
<th>Units</th>
<th>Monthly</th>
</tr>
<tr><td>EC2 (App)</td><td>3× t3.medium (ASG)</td><td>$0.05/hr</td><td>2,160 hrs</td><td>$105</td></tr>
<tr><td>EC2 (GPU - STT/TTS)</td><td>3× g5.xlarge Spot</td><td>$0.41/hr</td><td>2,160 hrs</td><td>$900</td></tr>
<tr><td>EC2 (GPU - LLM)</td><td>1× g5.2xlarge Spot</td><td>$0.49/hr</td><td>720 hrs</td><td>$350</td></tr>
<tr><td>EC2 (Fine-tune)</td><td>p4d.24xlarge Spot</td><td>$13/hr</td><td>80 hrs</td><td>$1,040</td></tr>
<tr><td>RDS</td><td>db.t3.medium Multi-AZ</td><td>$0.16/hr</td><td>730 hrs</td><td>$120</td></tr>
<tr><td>ElastiCache</td><td>cache.t3.small cluster</td><td>$0.07/hr</td><td>730 hrs</td><td>$50</td></tr>
<tr><td>S3</td><td>500 GB + Lifecycle</td><td>$0.025/GB</td><td>500 GB</td><td>$25</td></tr>
<tr><td>CloudFront</td><td>500 GB transfer</td><td>$0.10/GB</td><td>500 GB</td><td>$50</td></tr>
<tr><td>Other Services</td><td>SES, ALB, NAT, Security</td><td>-</td><td>-</td><td>$310</td></tr>
<tr style="background-color: #f0f0f0;">
<td colspan="4"><b>MONTHLY TOTAL</b></td>
<td><b>$2,950</b></td>
</tr>
<tr style="background-color: #e0e0e0;">
<td colspan="4"><b>PHASE 2 TOTAL (6 months)</b></td>
<td><b>$17,700</b></td>
</tr>
</table>

<br>

<table>
<tr>
<th colspan="5" align="center">📊 PHASE 3: SCALE (Months 13-18)</th>
</tr>
<tr style="background-color: #f0f0f0;">
<td colspan="4"><b>MONTHLY TOTAL</b></td>
<td><b>$4,815</b></td>
</tr>
<tr style="background-color: #e0e0e0;">
<td colspan="4"><b>PHASE 3 TOTAL (6 months)</b></td>
<td><b>$28,890</b></td>
</tr>
</table>

<table>
<tr>
<th colspan="5" align="center">📊 PHASE 4: ENTERPRISE (Months 19-24)</th>
</tr>
<tr style="background-color: #f0f0f0;">
<td colspan="4"><b>MONTHLY TOTAL</b></td>
<td><b>$6,690</b></td>
</tr>
<tr style="background-color: #e0e0e0;">
<td colspan="4"><b>PHASE 4 TOTAL (6 months)</b></td>
<td><b>$40,140</b></td>
</tr>
</table>

## 7.2 Cost Summary

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                          24-MONTH COST SUMMARY                                    ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                   ║
║   Phase               │ Duration      │ Monthly      │ Total                     ║
║   ════════════════════╪═══════════════╪══════════════╪════════════════════════   ║
║   Phase 1 (Foundation)│ Months 1-6    │ $1,500       │ $9,000                    ║
║   Phase 2 (Growth)    │ Months 7-12   │ $2,950       │ $17,700                   ║
║   Phase 3 (Scale)     │ Months 13-18  │ $4,815       │ $28,890                   ║
║   Phase 4 (Enterprise)│ Months 19-24  │ $6,690       │ $40,140                   ║
║   ════════════════════╧═══════════════╧══════════════╧════════════════════════   ║
║                                                                                   ║
║   📊 24-MONTH PROJECTED SPEND                              $95,730               ║
║                                                                                   ║
║   💰 CREDITS REQUESTED                                     $200,000              ║
║   📦 REMAINING BUFFER                                      $104,270              ║
║   📅 RUNWAY                                                36+ months            ║
║                                                                                   ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

---

<br>

# 8. AWS Credits Request

## 8.1 Credit Allocation

<div align="center">

```
                           $200,000 CREDIT ALLOCATION
    ┌──────────────────────────────────────────────────────────────────────┐
    │                                                                      │
    │   GPU Compute (Inference)        ████████████████████████   $80,000  │
    │                                                                      │
    │   GPU Compute (Training)         ████████████              $30,000  │
    │                                                                      │
    │   Application Infrastructure     ██████████               $25,000  │
    │                                                                      │
    │   Database Services              ████████                 $20,000  │
    │                                                                      │
    │   Storage & Transfer             ██████                   $15,000  │
    │                                                                      │
    │   ML Platform (SageMaker)        ████                     $10,000  │
    │                                                                      │
    │   Security & Compliance          ████                      $8,000  │
    │                                                                      │
    │   Monitoring                     ██                        $5,000  │
    │                                                                      │
    │   Disaster Recovery              ██                        $5,000  │
    │                                                                      │
    │   Buffer                         █                         $2,000  │
    │                                                                      │
    └──────────────────────────────────────────────────────────────────────┘
```

</div>

## 8.2 Utilization Timeline

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                       CREDIT UTILIZATION OVER 24 MONTHS                           ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                   ║
║  Month    1    3    6    9    12   15   18   21   24                             ║
║  ─────────────────────────────────────────────────────────────────────────────   ║
║                                                                                   ║
║  Spend   ▂▂▂  ▃▃▃  ▄▄▄  ▅▅▅  ▆▆▆  ▆▆▆  ▇▇▇  ▇▇▇  ████                            ║
║                                                                                   ║
║  $       $5K  $17K $40K $64K $100K $127K $155K $179K $200K                        ║
║                                                                                   ║
║  ─────────────────────────────────────────────────────────────────────────────   ║
║                                                                                   ║
║  Phase 1 ════════════╗                                                            ║
║  Foundation ($40K)   ║                                                            ║
║                      ║                                                            ║
║  Phase 2             ╠════════════╗                                               ║
║  Growth ($60K)                    ║                                               ║
║                                   ║                                               ║
║  Phase 3                          ╠════════════╗                                  ║
║  Scale ($55K)                                  ║                                  ║
║                                                ║                                  ║
║  Phase 4                                       ╠════════════╗                     ║
║  Enterprise ($45K)                                          ║                     ║
║                                                              ║                     ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

## 8.3 Milestones & Deliverables

| # | Milestone | Timeline | AWS Services | Credits | Deliverable |
|:-:|-----------|----------|--------------|--------:|-------------|
| 1 | Infrastructure Setup | M1-2 | VPC, EC2, RDS, S3 | $8K | Production env |
| 2 | AI Model Deployment | M2-3 | GPU EC2 (g5), S3 | $12K | Self-hosted AI |
| 3 | Auto-Scaling | M3-4 | ASG, ALB, CloudWatch | $5K | Scalable arch |
| 4 | Indian Languages | M4-6 | p4d (fine-tune) | $15K | 6 languages |
| 5 | **500 Organizations** | M6 | Full stack | - | 🎯 Business |
| 6 | High Availability | M6-8 | Multi-AZ, ElastiCache | $10K | 99.9% uptime |
| 7 | ML Pipeline | M8-10 | SageMaker, ECR | $12K | Automation |
| 8 | **1,000 Organizations** | M12 | Scaled infra | - | 🎯 Business |
| 9 | Enterprise Security | M10-14 | WAF, Shield, GuardDuty | $15K | SOC 2 ready |
| 10 | Multi-Region DR | M14-16 | Cross-region, Route 53 | $18K | DR setup |
| 11 | **2,000 Organizations** | M18 | Enterprise stack | - | 🎯 Business |
| 12 | Edge Deployment | M18-20 | CloudFront, Lambda@Edge | $20K | Global latency |
| 13 | **Series A Readiness** | M24 | Full architecture | - | 🎯 Investor |

---

<br>

# 9. Business Impact & ROI

## 9.1 Cost Savings Analysis

<table>
<tr>
<th rowspan="2">Service</th>
<th colspan="2">Third-Party</th>
<th colspan="2">Self-Hosted</th>
<th rowspan="2">Savings</th>
</tr>
<tr>
<th>Provider</th>
<th>Cost/Month</th>
<th>Solution</th>
<th>Cost/Month</th>
</tr>
<tr>
<td><b>LLM</b></td>
<td>OpenAI GPT-4</td>
<td align="right">$3,000</td>
<td>Qwen2.5-7B</td>
<td align="right">$800</td>
<td align="center"><b>73%</b></td>
</tr>
<tr>
<td><b>STT</b></td>
<td>Deepgram</td>
<td align="right">$500</td>
<td>Faster-Whisper</td>
<td align="right">$150</td>
<td align="center"><b>70%</b></td>
</tr>
<tr>
<td><b>TTS</b></td>
<td>ElevenLabs</td>
<td align="right">$800</td>
<td>XTTS-v2</td>
<td align="right">$150</td>
<td align="center"><b>81%</b></td>
</tr>
<tr style="background-color: #f0f0f0;">
<td><b>TOTAL</b></td>
<td></td>
<td align="right"><b>$4,300</b></td>
<td></td>
<td align="right"><b>$1,100</b></td>
<td align="center"><b>74%</b></td>
</tr>
<tr style="background-color: #e0ffe0;">
<td colspan="5"><b>24-MONTH SAVINGS</b></td>
<td align="center"><b>$76,800</b></td>
</tr>
</table>

## 9.2 Growth Projections

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                         24-MONTH GROWTH PROJECTIONS                               ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                   ║
║   METRIC                │ Month 1  │ Month 6  │ Month 12 │ Month 18 │ Month 24  ║
║   ══════════════════════╪══════════╪══════════╪══════════╪══════════╪═══════════║
║                         │          │          │          │          │           ║
║   Organizations         │    50    │   200    │   500    │  1,000   │  2,000    ║
║                         │          │          │          │          │           ║
║   Voice Minutes/Month   │   10K    │   100K   │   500K   │  1.5M    │   3M      ║
║                         │          │          │          │          │           ║
║   API Calls/Month       │  100K    │    1M    │    5M    │   15M    │   30M     ║
║                         │          │          │          │          │           ║
║   MRR                   │   $5K    │   $30K   │  $100K   │  $250K   │  $500K    ║
║                         │          │          │          │          │           ║
║   ARR                   │  $60K    │  $360K   │  $1.2M   │   $3M    │   $6M     ║
║                         │          │          │          │          │           ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

## 9.3 Return on Investment

<div align="center">

| Metric | Value |
|--------|------:|
| **Credits Requested** | $200,000 |
| **Projected 24-Month Revenue** | $4,500,000 |
| **Revenue per $1 Credit** | **$22.50** |
| **AI Cost Savings** | $76,800 |
| **Post-Credit Annual Spend** | $80,000+ |
| **Jobs Created** | 15-20 |

</div>

## 9.4 Strategic Value to AWS

<table>
<tr>
<td width="50%">

### Direct Value

- ✅ **$80K+/year** post-credit spend
- ✅ **GPU showcase** for Indian market
- ✅ **2,000+ SMBs** introduced to AWS
- ✅ **AI/ML success story** for marketing
- ✅ **AWS Marketplace** SaaS listing

</td>
<td width="50%">

### Ecosystem Growth

- ✅ Reference customer for startups
- ✅ Case study: "74% AI cost reduction"
- ✅ GPU Spot instance best practices
- ✅ Self-hosted LLM documentation
- ✅ India market expansion

</td>
</tr>
</table>

---

<br>

# 10. Security & Compliance

## 10.1 Security Architecture

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                           SECURITY ARCHITECTURE                                   ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                   ║
║   LAYER 1: EDGE SECURITY                                                         ║
║   ┌────────────────────────────────────────────────────────────────────────────┐ ║
║   │  Route 53     │  CloudFront    │    AWS WAF      │   AWS Shield          │ ║
║   │  DNS + DNSSEC │  CDN + HTTPS   │    Web Firewall │   DDoS Protection     │ ║
║   └────────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                   ║
║   LAYER 2: NETWORK SECURITY                                                       ║
║   ┌────────────────────────────────────────────────────────────────────────────┐ ║
║   │  VPC          │  Security Groups │   NACLs        │  Private Subnets     │ ║
║   │  Isolation    │  Instance-level  │   Subnet-level │  No public access    │ ║
║   └────────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                   ║
║   LAYER 3: APPLICATION SECURITY                                                   ║
║   ┌────────────────────────────────────────────────────────────────────────────┐ ║
║   │  JWT Auth     │  RBAC           │   Rate Limiting │  CSRF/XSS Protection│ ║
║   │  + Refresh    │  Role-based     │   Per endpoint  │  Helmet.js          │ ║
║   └────────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                   ║
║   LAYER 4: DATA SECURITY                                                          ║
║   ┌────────────────────────────────────────────────────────────────────────────┐ ║
║   │  RDS Encryption│  S3 Encryption │  Secrets Manager│  KMS Keys           │ ║
║   │  At-rest + TLS │  SSE-S3/KMS    │  API credentials│  Customer-managed   │ ║
║   └────────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                   ║
║   LAYER 5: MONITORING & DETECTION                                                 ║
║   ┌────────────────────────────────────────────────────────────────────────────┐ ║
║   │  GuardDuty    │  CloudTrail    │   Security Hub  │  Config Rules        │ ║
║   │  Threat Intel │  API Logging   │   Findings      │  Compliance          │ ║
║   └────────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                   ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

## 10.2 Compliance Roadmap

| Standard | Timeline | Status | AWS Services |
|----------|----------|:------:|--------------|
| **SOC 2 Type II** | Month 18 | 🔵 Planned | CloudTrail, Config, Security Hub |
| **ISO 27001** | Month 24 | 🔵 Planned | AWS Artifact, KMS |
| **GDPR** | Month 6 | 🟢 Ready | Data residency, encryption |
| **India DPDP Act** | Month 3 | 🟢 Ready | ap-south-1, local storage |
| **PCI DSS** | Month 24 | 🔵 Planned | Payment isolation |

---

<br>

# 11. Contact Information

<div align="center">

<table>
<tr>
<td align="center" width="50%">

### Company Details

| | |
|-|-|
| **Company** | MyLeadX |
| **Website** | [myleadx.ai](https://myleadx.ai) |
| **Industry** | B2B SaaS / AI |
| **Founded** | 2024 |
| **Location** | Hyderabad, India |

</td>
<td align="center" width="50%">

### Primary Contact

| | |
|-|-|
| **Name** | Kishore |
| **Title** | CEO & Founder |
| **Email** | kishore@myleadx.ai |
| **Phone** | +91-9876543210 |
| **LinkedIn** | [linkedin.com/in/kishore](https://linkedin.com/in/kishore) |

</td>
</tr>
</table>

</div>

---

<br>

<div align="center">

## Document Approval

| Role | Name | Date | Signature |
|:----:|:----:|:----:|:---------:|
| **CEO & Founder** | Kishore | May 2026 | _____________ |
| **CTO** | | | _____________ |
| **AWS Contact** | | | _____________ |

---

<br>

### Thank You

*We look forward to partnering with AWS to build the future of AI-powered sales automation in India.*

<br>

![AWS](https://img.shields.io/badge/Built_on-AWS-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white)
![Credits](https://img.shields.io/badge/Request-$200K_Credits-success?style=for-the-badge)
![Region](https://img.shields.io/badge/Region-ap--south--1-blue?style=for-the-badge)

---

*This document is confidential and intended for AWS partnership evaluation purposes only.*

**Document Version:** 1.0 | **Last Updated:** May 2026

</div>
