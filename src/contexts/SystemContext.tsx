import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type StatusMap = Record<string, string>;

interface SystemContextType {
  statusMap: StatusMap;
  isLoadingSystem: boolean;
}

const SystemContext = createContext<SystemContextType>({
  statusMap: {},
  isLoadingSystem: true,
});

export const SystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [statusMap, setStatusMap] = useState<StatusMap>({});
  const [isLoadingSystem, setIsLoadingSystem] = useState(true);

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const { data, error } = await supabase.from('estados_ticket').select('id, nombre');
        if (error) throw error;
        
        if (data) {
          const map: StatusMap = {};
          data.forEach((status: any) => {
            // Guardamos el mapeo Nombre -> ID
            map[status.nombre] = status.id;
          });
          setStatusMap(map);
        }
      } catch (err) {
        console.error('Error fetching ticket statuses:', err);
      } finally {
        setIsLoadingSystem(false);
      }
    };

    fetchStatuses();
  }, []);

  return (
    <SystemContext.Provider value={{ statusMap, isLoadingSystem }}>
      {children}
    </SystemContext.Provider>
  );
};

export const useSystem = () => useContext(SystemContext);
