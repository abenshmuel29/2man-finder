export type Gender = 'male' | 'female'
export type BodyType = 'slim' | 'athletic' | 'average' | 'muscular' | 'curvy' | 'plus_size'
export type MemberStatus = 'pending' | 'approved' | 'rejected'
export type ProposalStatus = 'pending' | 'confirmed' | 'expired' | 'declined'

export type Neighborhood =
  | 'south_beach' | 'miami_beach' | 'brickell' | 'downtown' | 'wynwood'
  | 'coral_gables' | 'coconut_grove' | 'aventura' | 'north_miami'
  | 'south_miami' | 'doral' | 'kendall' | 'hialeah' | 'little_havana'
  | 'midtown' | 'design_district' | 'miami_shores'

export const NEIGHBORHOODS: { value: Neighborhood; label: string }[] = [
  { value: 'aventura', label: 'Aventura' },
  { value: 'brickell', label: 'Brickell' },
  { value: 'coconut_grove', label: 'Coconut Grove' },
  { value: 'coral_gables', label: 'Coral Gables' },
  { value: 'design_district', label: 'Design District' },
  { value: 'doral', label: 'Doral' },
  { value: 'downtown', label: 'Downtown Miami' },
  { value: 'hialeah', label: 'Hialeah' },
  { value: 'kendall', label: 'Kendall' },
  { value: 'little_havana', label: 'Little Havana' },
  { value: 'miami_beach', label: 'Miami Beach' },
  { value: 'miami_shores', label: 'Miami Shores' },
  { value: 'midtown', label: 'Midtown' },
  { value: 'north_miami', label: 'North Miami' },
  { value: 'south_beach', label: 'South Beach' },
  { value: 'south_miami', label: 'South Miami' },
  { value: 'wynwood', label: 'Wynwood' },
]

export const BODY_TYPES: { value: BodyType; label: string }[] = [
  { value: 'slim', label: 'Slim' },
  { value: 'athletic', label: 'Athletic' },
  { value: 'average', label: 'Average' },
  { value: 'muscular', label: 'Muscular' },
  { value: 'curvy', label: 'Curvy' },
  { value: 'plus_size', label: 'Plus Size' },
]

export interface Profile {
  id: string
  email: string
  name: string | null
  gender: Gender | null
  age: number | null
  height: string | null
  weight: string | null
  body_type: BodyType | null
  school: string | null
  snapchat: string | null
  instagram: string | null
  neighborhood: Neighborhood | null
  photos: string[]
  bio: string | null
  profile_complete: boolean
  created_at: string
  updated_at: string
}

export interface FriendGroup {
  id: string
  name: string
  description: string | null
  gender: Gender | null
  creator_id: string
  created_at: string
}

export interface FriendGroupMember {
  id: string
  group_id: string
  user_id: string
  status: MemberStatus
  vote_count: number
  invited_by: string | null
  created_at: string
  profile?: Profile
}

export interface FriendGroupWithMembers extends FriendGroup {
  friend_group_members: FriendGroupMember[]
}

export interface DoubleDateProposal {
  id: string
  guy1_id: string
  guy2_id: string
  girl1_id: string
  girl2_id: string
  guys_group_id: string | null
  girls_group_id: string | null
  status: ProposalStatus
  expires_at: string
  created_at: string
  guy1?: Profile
  guy2?: Profile
  girl1?: Profile
  girl2?: Profile
}

export interface ProposalConfirmation {
  id: string
  proposal_id: string
  user_id: string
  confirmed_at: string
}
