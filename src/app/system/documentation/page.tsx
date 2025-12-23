'use client';

import { AdminLayout } from '@/components/AdminLayout';
import { 
  Title, Text, Tabs, Accordion, Paper, ScrollArea, Badge, Group, ThemeIcon, Alert, Code, Divider, Stack, SimpleGrid, Table
} from '@mantine/core';
import { 
    IconBook, IconServer, IconDatabase, IconRobot, IconUsers, IconShoppingCart, IconLifebuoy, 
    IconApi, IconClock, IconReceipt2, IconFolder, IconCloudUpload, IconBrandDocker, IconTerminal, IconShieldLock, IconWorld
} from '@tabler/icons-react'; // Added IconWorld
import { useState } from 'react';
import { useAuthStore } from '@/lib/authStore';

// --- THE SYSTEM BIBLE DATA SOURCE ---
const DOCS = {
  architecture: [
    { 
        title: 'Backend API (NestJS)', 
        desc: 'Internal Docker Service: `backend-api`. Port 3003.',
        details: [
            'Framework: NestJS 10 (Modular, TypeScript).',
            'Runtime: Node.js v20 (Alpine Docker Image).',
            'Database: PostgreSQL 16 (Service: `postgres`).',
            'Queue: Redis 7 (Service: `redis`) for BullMQ.',
            'Search: Elasticsearch 7 (Service: `elasticsearch`).',
            'Backups: Automated Cloudflare R2 Encryption.',
            'Logs: JSON File Driver (Rotated, Max 10MB).'
        ]
    },
    { 
        title: 'Staff Panel (Next.js)', 
        desc: 'Internal Docker Service: `staff-panel`. Port 3004.',
        details: [
            'Framework: Next.js 14 (App Router).',
            'UI: Mantine v7 (Enterprise Components).',
            'State Management: Zustand (AuthStore, SettingsStore).',
            'Features: CRM, Ticketing, Order Management, System Health, RBAC Management.',
            'Docker: Multi-stage build (Standalone Output).',
            'Charts: Mantine Charts (Recharts wrapper).'
        ]
    },
    { 
        title: 'Storefront (Next.js)', 
        desc: 'Internal Docker Service: `storefront`. Port 3002.',
        details: [
            'Framework: Next.js 14.',
            'Styling: Bootstrap 5 (SCSS) + Custom CSS.',
            'Features: Client Portal, E-commerce Checkout, Live Chat Widget.',
            'Optimization: ISR (Incremental Static Regeneration) for Products.',
            'Socket: Client-side socket connection for real-time chat.'
        ]
    }
  ],
  security_master: [
      {
          category: '1. Governance, Risk & Compliance (GRC)',
          items: [
              'Security Governance: Policy Management, NIST/ISO Standards Library, Risk Appetite Definition.',
              'Risk Management: Threat Modeling, Risk Scoring Engine, Business Impact Analysis (BIA).',
              'Compliance Systems: Continuous Monitoring, Evidence Collection, GDPR/HIPAA Reporting.'
          ]
      },
      {
          category: '2. Identity, Access & Zero Trust',
          items: [
              'IAM: RBAC/ABAC, Privileged Access Management (PAM), Identity Lifecycle Automation.',
              'Zero Trust: Device Trust Scoring, Micro-Segmentation, Continuous Auth.',
              'Authentication: MFA Everywhere, Impossible Travel Detection, Credential Stuffing Defense.'
          ]
      },
      {
          category: '3. Endpoint & Workload Security',
          items: [
              'Endpoint: EDR/XDR Integration, Full Disk Encryption, Device Posture Checks.',
              'Workload: Container Security (K8s), Runtime Anomaly Detection, Image Scanning.'
          ]
      },
      {
          category: '4. Network & Perimeter Defense',
          items: [
              'Network Controls: NGFW, Network Segmentation, IDS/IPS.',
              'DDoS Protection: Rate Limiting Engines, Traffic Scrubbing, Load Surge Detection.',
              'DNS Security: DNS Firewall, Tunneling Detection.'
          ]
      },
      {
          category: '5. Application & API Security',
          items: [
              'AppSec: Secure SDLC, SAST/DAST/IAST, Software Composition Analysis (SCA).',
              'API Security: Schema Validation, Token Rotation, Abuse Detection, Rate Limiting.'
          ]
      },
      {
          category: '6. Data Security & Privacy',
          items: [
              'Data Protection: DLP, Field-Level Encryption, Tokenization.',
              'Privacy: Consent Management, Data Subject Rights, Privacy Impact Assessments.',
              'Insider Risk: UEBA, Privileged Session Monitoring.'
          ]
      },
      {
          category: '7. Threat Intelligence & Detection',
          items: [
              'Threat Intel: IOC Management, Dark Web Monitoring.',
              'Detection: SIEM, MITRE ATT&CK Mapping, Behavioral Analytics.'
          ]
      },
      {
          category: '8. Incident Response & SOC',
          items: [
              'SOC Operations: Alert Correlation, Incident Prioritization, Automated Playbooks.',
              'Forensics: Memory/Disk Forensics, Chain of Custody Tracking.'
          ]
      },
      {
          category: '9. Automation & Self-Healing',
          items: [
              'SOAR: Automated Response Workflows, Cross-Tool Orchestration.',
              'Self-Healing: Auto-Isolation of Compromised Hosts, Auto-Credential Revocation.'
          ]
      },
      {
          category: '10. Cloud & Infrastructure',
          items: [
              'CSPM: Misconfiguration Detection, Cloud Asset Inventory.',
              'Infrastructure Hardening: OS Hardening (CIS), Secure Boot, Patch Monitoring.'
          ]
      }
  ],
  database: [
      { model: 'StaffUser', desc: 'Internal admins/agents. Has `roles` relation.', fields: 'email, passwordHash, status, roles[]' },
      { model: 'Contact', desc: 'External customers/leads. Has `leadScore`.', fields: 'email, phone, leadScore, organizationId' },
      { model: 'Ticket', desc: 'Support requests. Linked to Contact or Staff.', fields: 'subject, status, priority, sentimentScore' },
      { model: 'TicketMessage', desc: 'Chat messages. Can be internal notes.', fields: 'content, isInternal, staffUserId' },
      { model: 'Order', desc: 'E-commerce transactions.', fields: 'orderNumber, totalAmount, status, items[]' },
      { model: 'Product', desc: 'Catalog items. Has Variants.', fields: 'name, price, type (PHYSICAL/DIGITAL)' },
      { model: 'ScheduledJob', desc: 'Dynamic Cron Jobs configuration.', fields: 'cron, isActive, triggerEvent, lastRun' },
      { model: 'SystemSettings', desc: 'Global config store.', fields: 'siteName, aiEnabled, brandColor' },
      { model: 'AuditLog', desc: 'Immutable record of staff actions.', fields: 'action, targetId, payload, userId' }
  ],
  cron: [
      { id: 'RUN_BACKUP', time: 'User Defined', desc: 'Dumps DB, Zips Uploads, Encrypts, Uploads to R2.' },
      { id: 'RUN_SLA_CHECK', time: '0 * * * *', desc: 'Checks OPEN tickets older than 24h. Marks as Escalated.' },
      { id: 'RUN_LEAD_SCORING', time: '0 0 * * *', desc: 'AI Engine recalculates Lead Score for all contacts based on Orders/Tickets.' },
      { id: 'RUN_INVENTORY_CHECK', time: '0 6 * * *', desc: 'Scans for low stock variants and alerts Admins.' },
      { id: 'RUN_CLEANUP_LOGS', time: '0 0 1 * *', desc: 'Archives Audit Logs older than 90 days.' },
      { id: 'RUN_OVERDUE_INVOICES', time: '0 9 * * 1', desc: 'Emails customers with unpaid invoices > 7 days.' }
  ],
  backup: [
      { key: 'Provider', val: 'Cloudflare R2 (S3 Compatible)' },
      { key: 'Frequency', val: 'Daily (Configurable via Cron UI)' },
      { key: 'Encryption', val: 'GPG (At Rest & In Transit)' },
      { key: 'Retention', val: 'Cloud Lifecycle Policy (30 Days)' },
      { key: 'Contents', val: 'Postgres Dump (.sql) + /uploads Folder (.zip)' }
  ],
  endpoints: [
      { method: 'GET', url: '/auth/profile', desc: 'Get current user session.' },
      { method: 'POST', url: '/chat/messages', desc: 'Send new message (HTTP Fallback).' },
      { method: 'GET', url: '/analytics/dashboard', desc: 'Aggregated stats for Dashboard.' },
      { method: 'POST', url: '/ai/analyze', desc: 'Force manual sentiment analysis.' },
      { method: 'POST', url: '/documents/upload', desc: 'Upload file (Multipart/Form-Data).' }
  ],
  dev: [
    { 
        section: 'Docker Operations (Run as Root)',
        cmds: [
            { cmd: 'cd /home/docker-infrastructure', desc: 'Go to the infrastructure folder.' },
            { cmd: 'docker compose up -d', desc: 'Start/Update all containers (Detached).' },
            { cmd: 'docker compose build backend-api', desc: 'Rebuild API after code changes.' },
            { cmd: 'docker compose restart', desc: 'Restart the entire stack.' },
            { cmd: 'docker logs -f pf_backend', desc: 'Tail live logs from the API.' },
            { cmd: 'docker exec -it pf_backend sh', desc: 'SSH directly INTO the running container.' }
        ]
    },
    { 
        section: 'Database Ops',
        cmds: [
            { cmd: 'docker exec pf_backend npx prisma studio', desc: 'Launch Prisma Studio (Tunnel required).' },
            { cmd: 'docker exec pf_backend npx prisma migrate deploy', desc: 'Run pending migrations.' }
        ]
    }
  ],
  modules: [
    {
      id: 'crm',
      icon: <IconUsers size={16}/>,
      label: 'CRM & Sales Engine',
      content: [
        { q: 'Lead Scoring Algorithm', a: 'Score = (Orders * 50) + (Profile Complete * 10) - (Support Tickets * 5). Runs nightly via Cron. High scores (>50) get a 🔥 badge.' },
        { q: 'Organization Logic', a: 'Entities grouping multiple Contacts. Allows shared billing, projects, and tickets. Useful for B2B relationships.' },
        { q: 'Sales Pipeline', a: 'Opportunities track potential deals. Stages: Qualification -> Proposal -> Negotiation -> Won/Lost.' }
      ]
    },
    {
      id: 'store',
      icon: <IconShoppingCart size={16}/>,
      label: 'E-Commerce & Inventory',
      content: [
        { q: 'Product Variants', a: 'Inventory is tracked at the Variant level (SKU). Parent products are just containers. Deleting a parent deletes all variants.' },
        { q: 'Order Fulfillment', a: 'Flow: PENDING -> PAID -> PROCESSING -> SHIPPED. Staff must manually enter Tracking Numbers to move to SHIPPED.' },
        { q: 'Digital Products', a: 'If type is DIGITAL, shipping address is skipped. (Future: Auto-email download links).' }
      ]
    },
    {
      id: 'support',
      icon: <IconLifebuoy size={16}/>,
      label: 'Helpdesk & Chat',
      content: [
        { q: 'Omni-Channel Sync', a: 'Chat messages and Ticket comments are the same data entity (`TicketMessage`). Staff reply once, user sees it in Chat or Email.' },
        { q: 'SLA Engine', a: 'Cron job runs hourly. Tickets OPEN > 24h are marked "Escalated". Notifications are sent to Managers.' },
        { q: 'Secure PIN', a: 'Agents click "Verify Identity". User enters PIN in chat. Server validates hash. Agent sees "Verified" system message.' }
      ]
    },
    {
      id: 'finance',
      icon: <IconReceipt2 size={16}/>,
      label: 'Finance & Procurement',
      content: [
        { q: 'Billing Engine', a: 'Generates PDF Invoices for Orders. Supports Recurring Subscriptions (via Stripe Integration). Tracks overdue payments.' },
        { q: 'Procurement (PO)', a: 'Allows generating Purchase Orders for Vendors to restock inventory. Receiving a PO automatically updates Product Variant stock levels.' }
      ]
    },
    {
      id: 'security',
      icon: <IconShieldLock size={16}/>,
      label: 'Security & RBAC',
      content: [
        { q: 'RBAC (Roles)', a: 'Access is governed by granular permissions (e.g. `user:read`, `finance:manage`). Roles group these permissions. Users are assigned Roles.' },
        { q: 'Data Redaction', a: 'Before data is sent to OpenAI, the "Security Gateway" middleware strips emails and phone numbers using Regex patterns to prevent PII leakage.' },
        { q: 'Audit Logging', a: 'Critical actions (Delete, Settings Change, Login) are immutably recorded in the `AuditLog` table with IP Address and User Agent.' }
      ]
    },
    {
      id: 'sentinel',
      icon: <IconShieldLock size={16}/>,
      label: 'Sentinel & Iron Dome',
      content: [
        { q: 'Honeypot Trap', a: 'Fake endpoints (e.g. `/wp-login.php`, `/.env`) detect bot scanners. Any access results in an immediate 365-day IP ban.' },
        { q: 'Geo-Fencing', a: 'Middleware checks the ISO Country Code of every request. Blocked regions receive a 403 Forbidden instantly, saving server resources. Configured in SOC.' },
        { q: 'System Sentinel', a: 'Real-time monitoring of server health (CPU Load and RAM Usage). Alerts admins if thresholds are breached.' },
        { q: 'Shadowbanning', a: 'Banned IPs are rejected at the network edge (Middleware) before reaching the Database or API logic, preventing DoS exhaustion.' }
      ]
    },
  ],
  ai: [
      {
          title: 'Smart Drafts',
          trigger: 'New Ticket Created',
          action: 'PixelMind reads the subject, searches the Knowledge Base for context, and drafts a reply.',
          output: 'A hidden "Internal Note" is added to the ticket for the agent to review/edit.'
      },
      {
          title: 'Sentiment Analysis',
          trigger: 'Every Inbound Message',
          action: 'Natural Language Processing (NLP) detects the emotional tone (Angry, Happy, Neutral).',
          output: 'Updates the Ticket Sentiment Score and Dashboard charts in real-time.'
      },
      {
          title: 'Lead Scoring',
          trigger: 'Cron Job (Hourly)',
          action: 'Calculates customer value based on Spend vs Support Load.',
          output: 'Updates the `Contact` record with a numeric score and "Hot/Cold" status.'
      },
      {
          title: 'PII Redaction',
          trigger: 'Before OpenAI Request',
          action: 'Regex scans for emails (user@domain.com) and phone numbers.',
          output: 'Replaces sensitive data with [REDACTED] to ensure privacy compliance.'
      }
  ],
  // --- NEW SEO SECTION ---
  seo: [
    {
        title: 'Social Graph Engine',
        trigger: 'Link Shared on Social',
        action: 'Server-Side Rendering (SSR) injects `og:title`, `og:image`, and `twitter:card` meta tags dynamically.',
        output: 'Rich Link Previews on LinkedIn, Slack, Discord, and Twitter.'
    },
    {
        title: 'Internal Network Tunnel',
        trigger: 'Page Load',
        action: 'Storefront connects to Backend via `http://pf_backend:3003` (Internal Docker Network).',
        output: '0ms Latency, Bypasses SSL Verification, Isolated from Public Internet.'
    },
    {
        title: 'Discovery Bots',
        trigger: 'Google Crawler',
        action: 'Reads `robots.txt` (Access Rules) and `sitemap.xml` (Page Map) generated dynamically via Route Handlers.',
        output: 'Pages indexed by Search Engines. Admin/Auth routes hidden.'
    },
    {
        title: 'Next.js Metadata',
        trigger: 'Route Navigation',
        action: '`generateMetadata()` runs on the Server. If Staff Panel has an override, it uses it. Else, defaults.',
        output: 'Dynamic titles per product/page without client-side flicker.'
    }
  ]
};

export default function DocumentationPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<string | null>('overview');
  
  const perms = user?.permissions || [];
  const canSeeDev = perms.includes('doc:dev:read') || perms.includes('rbac:manage');

  return (
    <AdminLayout>
      <Group justify="space-between" mb="xl">
          <Group>
              <IconBook size={32} stroke={1.5} />
              <div>
                  <Title order={2}>System Documentation</Title>
                  <Text c="dimmed">The definitive guide to the PixelForge Enterprise OS.</Text>
              </div>
          </Group>
      </Group>

      <Paper withBorder p="md" radius="md">
        <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List mb="md">
                <Tabs.Tab value="overview" leftSection={<IconServer size={16}/>}>Architecture</Tabs.Tab>
                <Tabs.Tab value="security" leftSection={<IconShieldLock size={16}/>} c="red">Security & GRC</Tabs.Tab>
                <Tabs.Tab value="seo" leftSection={<IconWorld size={16}/>} c="teal">SEO & Discovery</Tabs.Tab> {/* NEW TAB */}
                <Tabs.Tab value="backup" leftSection={<IconCloudUpload size={16}/>}>Backups & R2</Tabs.Tab>
                <Tabs.Tab value="backend" leftSection={<IconApi size={16}/>}>API & Cron</Tabs.Tab>
                <Tabs.Tab value="database" leftSection={<IconDatabase size={16}/>}>Database</Tabs.Tab>
                <Tabs.Tab value="modules" leftSection={<IconFolder size={16}/>}>Modules</Tabs.Tab>
                <Tabs.Tab value="ai" leftSection={<IconRobot size={16}/>} color="violet">PixelMind AI</Tabs.Tab>
                {canSeeDev && <Tabs.Tab value="dev" leftSection={<IconBrandDocker size={16}/>} color="blue">DevOps & Docker</Tabs.Tab>}
            </Tabs.List>

            <ScrollArea h="calc(100vh - 280px)" type="auto" offsetScrollbars>
                
                {/* --- ARCHITECTURE --- */}
                <Tabs.Panel value="overview">
                    <Stack gap="lg">
                        <Alert title="Containerized Environment" color="blue" icon={<IconBrandDocker/>}>
                           System is running on Docker Swarm/Compose. All services are isolated and resource-capped.
                        </Alert>
                        <SimpleGrid cols={2}>
                            {DOCS.architecture.map((item, i) => (
                                <Paper key={i} withBorder p="md" radius="md">
                                    <Title order={5} mb="xs">{item.title}</Title>
                                    <Text size="sm" c="dimmed" mb="sm">{item.desc}</Text>
                                    <Stack gap="xs">
                                        {item.details.map((d, k) => (
                                            <Group key={k} gap="xs" align="flex-start">
                                                <ThemeIcon size={6} color="gray" radius="xl" mt={6} />
                                                <Text size="xs" style={{ flex: 1 }}>{d}</Text>
                                            </Group>
                                        ))}
                                    </Stack>
                                </Paper>
                            ))}
                        </SimpleGrid>
                    </Stack>
                </Tabs.Panel>

                {/* --- SEO (NEW) --- */}
                <Tabs.Panel value="seo">
                    <Stack gap="lg">
                         <Alert title="Discovery Engine Operational" color="teal" icon={<IconWorld/>}>
                            The Storefront is equipped with a Server-Side SEO Engine. Titles and Meta Tags are dynamically injected via the Staff Panel overrides.
                        </Alert>
                        <SimpleGrid cols={2}>
                            {DOCS.seo.map((feat, i) => (
                                <Paper key={i} withBorder p="md" radius="md">
                                    <Title order={5} mb="sm" c="teal.9">{feat.title}</Title>
                                    <Text size="xs" fw={700} tt="uppercase" c="dimmed">Trigger</Text>
                                    <Text size="sm" mb="xs">{feat.trigger}</Text>
                                    <Text size="xs" fw={700} tt="uppercase" c="dimmed">Action</Text>
                                    <Text size="sm" mb="xs">{feat.action}</Text>
                                    <Text size="xs" fw={700} tt="uppercase" c="dimmed">Output</Text>
                                    <Text size="sm">{feat.output}</Text>
                                </Paper>
                            ))}
                        </SimpleGrid>
                        <Title order={4} mt="md">Robots Configuration</Title>
                        <Paper withBorder p="md" bg="gray.9" c="white">
                            <Code block bg="transparent" c="white">{`
User-agent: *
Allow: /
Disallow: /account/
Disallow: /checkout/
Disallow: /auth/

Sitemap: https://pixelforgedeveloper.com/sitemap.xml
                            `}</Code>
                        </Paper>
                    </Stack>
                </Tabs.Panel>

                {/* --- SECURITY (NEW) --- */}
                <Tabs.Panel value="security">
                    <Stack gap="lg">
                        <Alert title="Enterprise Security Master Plan" color="red" icon={<IconShieldLock/>} variant="light">
                            This system implements a comprehensive Defense-in-Depth strategy covering GRC, Identity, Infrastructure, and Application Security.
                        </Alert>
                        <SimpleGrid cols={2}>
                            {DOCS.security_master.map((sec, i) => (
                                <Paper key={i} withBorder p="md" radius="md" bg={i % 2 === 0 ? 'white' : 'gray.0'}>
                                    <Title order={5} mb="sm" c="red.9">{sec.category}</Title>
                                    <Stack gap="xs">
                                        {sec.items.map((item, k) => (
                                            <Group key={k} gap="xs" align="flex-start">
                                                <ThemeIcon size={6} color="red" radius="xl" mt={6} variant="outline" />
                                                <Text size="xs" style={{ flex: 1 }}>{item}</Text>
                                            </Group>
                                        ))}
                                    </Stack>
                                </Paper>
                            ))}
                        </SimpleGrid>
                    </Stack>
                </Tabs.Panel>

                {/* --- BACKUP --- */}
                <Tabs.Panel value="backup">
                    <Stack gap="lg">
                        <Alert title="Zero-Knowledge Security" color="violet" icon={<IconCloudUpload/>}>
                            Backups are encrypted using GPG before leaving the server. Cloudflare R2 only sees encrypted blobs.
                        </Alert>
                        <Table withTableBorder withColumnBorders>
                            <Table.Tbody>
                                {DOCS.backup.map((b, i) => (
                                    <Table.Tr key={i}>
                                        <Table.Td fw={700} w={200} bg="gray.0">{b.key}</Table.Td>
                                        <Table.Td>{b.val}</Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Stack>
                </Tabs.Panel>

                {/* --- BACKEND API & CRON --- */}
                <Tabs.Panel value="backend">
                    <Stack gap="xl">
                        <div>
                            <Group mb="sm"><IconClock size={20}/><Title order={4}>Cron Automation</Title></Group>
                            <Paper withBorder p="md">
                                <Stack>
                                    {DOCS.cron.map((job, i) => (
                                        <Group key={i} justify="space-between">
                                            <div>
                                                <Text fw={700}>{job.id}</Text>
                                                <Text size="sm" c="dimmed">{job.desc}</Text>
                                            </div>
                                            <Badge variant="outline">{job.time}</Badge>
                                        </Group>
                                    ))}
                                </Stack>
                            </Paper>
                        </div>
                        <div>
                            <Group mb="sm"><IconApi size={20}/><Title order={4}>Key API Endpoints</Title></Group>
                            <Stack gap="xs">
                                {DOCS.endpoints.map((ep, i) => (
                                    <Paper key={i} withBorder p="sm">
                                        <Group>
                                            <Badge color={ep.method === 'POST' ? 'orange' : 'blue'}>{ep.method}</Badge>
                                            <Code>{ep.url}</Code>
                                            <Text size="sm">{ep.desc}</Text>
                                        </Group>
                                    </Paper>
                                ))}
                            </Stack>
                        </div>
                    </Stack>
                </Tabs.Panel>

                {/* --- DATABASE --- */}
                <Tabs.Panel value="database">
                    <Stack>
                        <Title order={4}>Core Models (Prisma Schema)</Title>
                        <Text size="sm" c="dimmed" mb="md">Located in `backend-api/prisma/schema.prisma`</Text>
                        <Table striped withTableBorder withColumnBorders>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Model Name</Table.Th>
                                    <Table.Th>Description</Table.Th>
                                    <Table.Th>Key Fields</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {DOCS.database.map((db, i) => (
                                    <Table.Tr key={i}>
                                        <Table.Td fw={700} c="blue">{db.model}</Table.Td>
                                        <Table.Td>{db.desc}</Table.Td>
                                        <Table.Td><Code>{db.fields}</Code></Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Stack>
                </Tabs.Panel>

                {/* --- MODULES --- */}
                <Tabs.Panel value="modules">
                    <Stack>
                        {DOCS.modules.map((mod) => (
                            <Accordion key={mod.id} variant="separated" radius="md">
                                <Accordion.Item value={mod.id}>
                                    <Accordion.Control icon={mod.icon}>
                                        <Text fw={600}>{mod.label}</Text>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        <Stack gap="md">
                                            {mod.content.map((item, k) => (
                                                <div key={k}>
                                                    <Group gap="xs" mb={4}>
                                                        <ThemeIcon size={20} radius="xl" color="blue" variant="light">?</ThemeIcon>
                                                        <Text fw={700} size="sm">{item.q}</Text>
                                                    </Group>
                                                    <Text size="sm" pl={34} c="dimmed">{item.a}</Text>
                                                    {k < mod.content.length - 1 && <Divider my="sm" variant="dashed"/>}
                                                </div>
                                            ))}
                                        </Stack>
                                    </Accordion.Panel>
                                </Accordion.Item>
                            </Accordion>
                        ))}
                    </Stack>
                </Tabs.Panel>

                {/* --- AI --- */}
                <Tabs.Panel value="ai">
                    <Stack>
                         <Alert variant="light" color="violet" title="PixelMind Integration" icon={<IconRobot/>}>
                            The AI module is an event-driven service (`AiService`). It acts autonomously based on system triggers.
                        </Alert>
                        <SimpleGrid cols={2}>
                            {DOCS.ai.map((feat, i) => (
                                <Paper key={i} withBorder p="md" radius="md">
                                    <Title order={5} mb="sm" c="violet">{feat.title}</Title>
                                    <Text size="xs" fw={700} tt="uppercase" c="dimmed">Trigger</Text>
                                    <Text size="sm" mb="xs">{feat.trigger}</Text>
                                    <Text size="xs" fw={700} tt="uppercase" c="dimmed">Action</Text>
                                    <Text size="sm" mb="xs">{feat.action}</Text>
                                    <Text size="xs" fw={700} tt="uppercase" c="dimmed">Output</Text>
                                    <Text size="sm">{feat.output}</Text>
                                </Paper>
                            ))}
                        </SimpleGrid>
                        <Title order={4} mt="md">Workflow Visualization</Title>
                        <Paper withBorder p="md" bg="gray.9" c="white">
                            <Code block bg="transparent" c="white">{`
1. User sends message ("How do I return an item?")
   │
   ▼
2. Gateway emits 'ticket.message.created'
   │
   ▼
3. AI Service intercepts event
   │
   ▼
4. Security Gateway scans text -> "How do I return..." (Redacts PII)
   │
   ▼
5. OpenAI API called (GPT-4o)
   │
   ▼
6. Draft Generated & Saved as Internal Note
   │
   ▼
7. Staff Dashboard updates in real-time via Socket.io
                            `}</Code>
                        </Paper>
                    </Stack>
                </Tabs.Panel>

                {/* --- DEV / DOCKER --- */}
                {canSeeDev && (
                    <Tabs.Panel value="dev">
                        <Stack gap="xl">
                            {DOCS.dev.map((section, i) => (
                                <div key={i}>
                                    <Group mb="sm"><IconTerminal size={20}/><Title order={4}>{section.section}</Title></Group>
                                    <Stack gap="sm">
                                        {section.cmds.map((cmd, k) => (
                                            <Paper key={k} withBorder p="sm" radius="md" bg="gray.1">
                                                <Group justify="space-between">
                                                    <Code color="blue" style={{ fontSize: '0.9rem' }}>{cmd.cmd}</Code>
                                                    <Text size="sm">{cmd.desc}</Text>
                                                </Group>
                                            </Paper>
                                        ))}
                                    </Stack>
                                </div>
                            ))}
                        </Stack>
                    </Tabs.Panel>
                )}

            </ScrollArea>
        </Tabs>
      </Paper>
    </AdminLayout>
  );
}