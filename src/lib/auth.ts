import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  full_name: string;
  role: 'super_admin' | 'operator_admin' | 'operator_sales';
  operator_id: string | null;
  operators?: {
    id: string;
    name: string;
    website?: string;
    social_links?: string[];
    quotation_agency_notes?: string;
  } | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null);

  useEffect(() => {
    const savedOperatorId = localStorage.getItem('selected_operator_id');
    if (savedOperatorId) {
      setSelectedOperatorId(savedOperatorId);
    }

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const currentUser = session.user;
          setUser(currentUser);

          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .maybeSingle();

          if (profileError) {
            console.error("Auth: Profile fetch failed", profileError.message);
          }

          if (profileData) {
            const operatorToFetch = (profileData.role === 'super_admin' && savedOperatorId) 
              ? savedOperatorId 
              : profileData.operator_id;

            const { data: operatorData } = await supabase
              .from('operators')
              .select('*')
              .eq('id', operatorToFetch)
              .maybeSingle();
            
            setProfile({ ...profileData, operators: operatorData });
            
            if (profileData.role === 'super_admin' && !savedOperatorId) {
              setSelectedOperatorId(profileData.operator_id);
              localStorage.setItem('selected_operator_id', profileData.operator_id);
            }
          }
        }
      } catch (err) {
        console.error("Auth: Initialization failed", err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const updateSelectedOperator = (id: string) => {
    setSelectedOperatorId(id);
    localStorage.setItem('selected_operator_id', id);
  };

  return { 
    user, 
    profile, 
    loading, 
    selectedOperatorId: profile?.role === 'super_admin' ? selectedOperatorId : profile?.operator_id,
    setSelectedOperatorId: updateSelectedOperator 
  };
}
