export type ReportPage =
  | { kind: 'cover'; tag: string; title: string; subtitle: string; meta: string }
  | { kind: 'section'; heading: string; paragraphs: string[] }
  | { kind: 'list'; heading: string; intro?: string; items: string[] }
  | {
      kind: 'matrix';
      heading: string;
      intro?: string;
      rows: { type: string; level: string; note: string }[];
    }
  | { kind: 'cta'; heading: string; paragraphs: string[]; buttonLabel: string };

export const iotSmartCampusReportPages: ReportPage[] = [
  {
    kind: 'cover',
    tag: 'FIELD REPORT // IOT SECURITY',
    title: 'Threats & Attacks on an IoT-Based Smart Campus System',
    subtitle:
      'How a university campus becomes an attack surface — and what a full on-path compromise chain looks like from the inside.',
    meta: 'Independent research · Qarshi University, Lahore · BS Computer Science final year project',
  },
  {
    kind: 'section',
    heading: 'Executive Summary',
    paragraphs: [
      'Smart campuses connect parking, libraries, ID cards, attendance, exams and building systems onto one IoT network — convenient for students and staff, and a single flat attack surface for anyone who gets a foothold on it.',
      'This project designed a smart-campus IoT architecture (Raspberry Pi and Arduino sensor nodes reporting to a cloud/local backend) and then, entirely inside an isolated academic lab, built and executed a full on-path attack chain against it — from network reconnaissance through to spoofing traffic and injecting content into live sessions.',
      "The goal wasn't to build an exploit for its own sake. It was to show, concretely, why “we're on a closed campus network so it's fine” is not a security model.",
    ],
  },
  {
    kind: 'list',
    heading: 'What Was Built',
    intro:
      'The target: a working smart-campus IoT design covering the modules students actually touch every day.',
    items: [
      'Smart parking — IR sensors + camera-based lot detection and guidance',
      'Smart library & canteen — requests served through a phone app talking to the backend',
      'Smart ID card — access control, payments and attendance tied to one credential',
      'Smart attendance — RFID-based check-in replacing manual roll calls',
      'Smart examination monitoring — per-question timing telemetry sent to a web app',
      'Smart timetable — live scheduling data pushed to every connected device',
    ],
  },
  {
    kind: 'list',
    heading: 'Six-Layer Security Model',
    intro: 'The threat model behind campus-cloud IoT deployments, layer by layer.',
    items: [
      'Physical security — site, equipment and transmission-medium hardening',
      'Network security — topology, segmentation, load balancing and intrusion detection',
      'Data security — access control, encryption, isolation and backup/restore',
      'Service security — identification, authentication and availability under load',
      'Application security — AAA (authentication, authorization, accounting) and traceable access',
      'Management security — audit trails and administrative accountability',
    ],
  },
  {
    kind: 'matrix',
    heading: 'Threat & Attack Matrix',
    intro: 'A condensed view of the classification used to score every attack in this study.',
    rows: [
      {
        type: 'Passive eavesdropping',
        level: 'Low',
        note: 'Silent traffic analysis, no alteration',
      },
      {
        type: 'Man-in-the-middle',
        level: 'Low–Medium',
        note: 'Alters or steals unencrypted data in transit',
      },
      {
        type: 'Data gathering',
        level: 'Medium–High',
        note: 'Skimming, tampering across wired/wireless links',
      },
      {
        type: 'Active tampering',
        level: 'High',
        note: 'Alters integrity, blocks or re-routes messages',
      },
      {
        type: 'Imitation / spoofing',
        level: 'High',
        note: 'Impersonates a trusted device to steal data or spread malware',
      },
      {
        type: 'Privacy disclosure',
        level: 'High',
        note: 'Exposes sensitive individual or group information',
      },
      {
        type: 'Interruption',
        level: 'High',
        note: 'Takes availability away from authorized users',
      },
      {
        type: 'Blocking / DoS',
        level: 'Extremely High',
        note: 'Jamming, flooding, malware saturating the network',
      },
      {
        type: 'Fabrication',
        level: 'Extremely High',
        note: 'Injects false data, breaking authenticity outright',
      },
    ],
  },
  {
    kind: 'list',
    heading: 'The Attack Chain — What Was Actually Executed',
    intro: 'Seven stages, each building on the last, run end-to-end against the lab environment.',
    items: [
      '1. Reconnaissance — mapped every device on the local segment',
      '2. ARP spoofing — poisoned the gateway’s ARP cache to sit on-path between clients and the network',
      '3. Traffic interception — sniffed the redirected traffic for credentials and session data',
      '4. DNS spoofing — redirected specific hostnames (e.g. the smart-library portal) to an attacker-controlled host',
      '5. Content substitution — swapped a real timetable or result file for a forged one served through the poisoned DNS entry',
      '6. Script injection — pushed arbitrary JavaScript into an intercepted session (cookie theft, fake alerts, a foothold for further control)',
      '7. HTTPS downgrade — used an SSL-stripping proxy to force secure pages back to plaintext before repeating the steps above',
    ],
  },
  {
    kind: 'list',
    heading: 'Key Findings',
    items: [
      'A single compromised device on a large campus network is enough to pivot into the entire smart-campus segment — attackers don’t need to breach every machine, just one weak link.',
      'None of the seven techniques required specialised hardware — commodity tools were sufficient to execute the full chain.',
      'The weakest layer wasn’t the sensors or the cloud backend — it was unauthenticated ARP and DNS resolution at the network layer, underneath all of it.',
      'Services trusting a plain IP address rather than an authenticated identity turned out to be the recurring root cause across almost every attack in the chain.',
    ],
  },
  {
    kind: 'list',
    heading: 'Recommendations',
    items: [
      'Dynamic ARP Inspection or static ARP entries on campus switches to shut down ARP spoofing at the source',
      'DNSSEC and DNS-over-TLS for internal resolution, so a poisoned cache can’t silently redirect students to a fake portal',
      'Mutual TLS between IoT sensor nodes and the backend, not plain HTTP',
      'HSTS with preload site-wide, so an SSL-stripping proxy has nothing left to downgrade',
      'Network segmentation — IoT sensor VLANs isolated from the student-facing app network',
      'Signed, authenticated updates for anything served to end-user devices, so content-substitution attacks fail integrity checks',
    ],
  },
  {
    kind: 'cta',
    heading: 'Read the Full Report',
    paragraphs: [
      'Every technique above was built and tested exclusively inside a controlled academic lab. The attack scripts are not for use against live systems — campus or otherwise — and doing so is illegal under Pakistan’s cyber law and everywhere else.',
      'The full report includes the complete methodology, the six-layer security analysis in detail, and the technical walkthrough of every attack stage.',
    ],
    buttonLabel: 'Request the full report',
  },
];
