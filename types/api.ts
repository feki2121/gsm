// types/api.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  nom: string;
  role: "ADMIN" | "CHAUFFEUR";
  createdAt: Date;
  updatedAt: Date;
  chauffeur?: {
    id: string;
    nom: string;
    telephone: string;
    vehiculeId?: string;
    vehicule?: {
      id: string;
      immatricule: string;
      nom: string;
    };
  };
}