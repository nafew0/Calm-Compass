import {
  Bath,
  BookOpenText,
  BrainCircuit,
  HeartCrack,
  Map,
  MessageCircleWarning,
  MoonStar,
  Pill,
  Repeat2,
  ShieldAlert,
  Siren,
} from 'lucide-react'

const KNOWLEDGEBASE_ICON_MAP = {
  'repeat-2': Repeat2,
  siren: Siren,
  'shield-alert': ShieldAlert,
  bath: Bath,
  map: Map,
  'moon-star': MoonStar,
  pill: Pill,
  'message-circle-warning': MessageCircleWarning,
  'heart-crack': HeartCrack,
  'brain-circuit': BrainCircuit,
}

export function getKnowledgebaseIcon(iconName) {
  return KNOWLEDGEBASE_ICON_MAP[iconName] || BookOpenText
}
