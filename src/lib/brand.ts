/**
 * Brand configuration — the single place to change when the final name lands.
 * Colours/fonts also live as CSS variables in globals.css (kept in sync manually).
 */
export const brand = {
  /** Working name — final brand TBD (doc says CareMatch, design says Kindred). */
  name: "Kindred",
  legalName: "Kindred Care Ltd",
  domain: "kindredcare.co.uk",
  email: "hello@kindredcare.co.uk",
  phone: "0800 000 0000",
  phoneHref: "tel:08000000000",
  tagline: "Care that feels like kindred.",
  description:
    "Introducing families to private carers and nurses, matched with care. Nationwide across the UK.",
  regulationNote:
    "is an introductory agency. We introduce self-employed carers and nurses to private clients and do not manage, supervise or deliver the care ourselves — so we sit outside the remit of the Care Quality Commission. All carers are vetted to CQC-equivalent standards. Clients contract with and pay their carer directly.",

  colors: {
    green: "#3F5E54",
    greenDark: "#335047",
    ink: "#243530",
    inkDeep: "#1c2a26",
    cream: "#F4EFE8",
    card: "#FBF8F3",
    sand: "#EAE2D4",
    tan: "#C9B89A",
    body: "#4B5852",
    muted: "#5A6A62",
    faint: "#8A7E6A",
    sage: "#B9C6BF",
    sageLight: "#CBD6CF",
  },
} as const;

export type Brand = typeof brand;
