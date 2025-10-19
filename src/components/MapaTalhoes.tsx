'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import * as L from 'leaflet';
import type { User } from '@/lib/auth';
import type { Talhao } from '@/lib/data';

interface Props {
  user: User;
  talhoes: Talhao[];
  onTalhaoSelect?: (talhao: Talhao) => void;
  selectedTalhaoId?: string;
  readOnly?: boolean;
}
export default function MapaTalhoes({ user, talhoes, onTalhaoSelect, selectedTalhaoId, readOnly=false }: Props){
  const [isClient, setIsClient] = useState(false);
  const talhoesGroupRef = useRef<L.FeatureGroup<any>>(null);
  const layersById = useRef<Map<string, L.Layer>>(new Map());
  const canEdit = !readOnly && (user.role==='master' || user.role==='cliente');
  const isPiloto = user.role === 'piloto';
  const [localSel, setLocalSel] = useState<string|undefined>(undefined);
  const effectiveSel = selectedTalhaoId ?? localSel;

  useEffect(()=>setIsClient(true),[]);

  const baseStyle = useMemo(()=>({ color:'#2d5c32', weight:5, fillOpacity:0 }),[]);
  const selectedStyle = useMemo(()=>({ color:'#2d5c32', weight:8, fillOpacity:0 }),[]);
  const hoverStyle = useMemo(()=>({ weight:7 }),[]);

  const styleFor = (id?:string)=> (id && effectiveSel===id) ? selectedStyle : baseStyle;

  const rebuild = ()=>{
    const g = talhoesGroupRef.current; if(!g) return;
    g.clearLayers(); layersById.current.clear();
    talhoes.forEach(t=>{
      const gj = t.geojson; if(!gj) return;
      const layer = L.geoJSON(gj as any, {
        style: ()=> styleFor(t.id),
        onEachFeature: (_f, lyr)=>{
          lyr.on('click', ()=>{ setLocalSel(t.id); highlight(t.id); onTalhaoSelect?.(t); });
          lyr.on('mouseover', function(){ (this as L.Path).setStyle(hoverStyle as any)});
          lyr.on('mouseout', function(){ (this as L.Path).setStyle(styleFor(t.id) as any)});
        }
      });
      layer.addTo(g);
      layersById.current.set(t.id, layer);
    });
    if(effectiveSel) highlight(effectiveSel);
  };

  const highlight = (id?:string)=>{
    layersById.current.forEach((layer, lid)=>{
      (layer as any).setStyle?.(styleFor(lid));
      if(lid===id) (layer as any).bringToFront?.();
    });
  };

  useEffect(()=>{ rebuild(); }, [talhoes]);
  useEffect(()=>{ highlight(effectiveSel); }, [effectiveSel]);

  if(!isClient) return <div style={{padding:16}}>Carregando mapa…</div>;

  return (
    <div style={{width:'100%',height:'100%'}}>
      <MapContainer center={[-21.1237, -47.5683]} zoom={17} style={{height:'100%',width:'100%'}}>
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
        <FeatureGroup ref={talhoesGroupRef as any} />
        {/* edição desligada para piloto; deixo estrutura pronta */}
        {canEdit && !isPiloto && (
          <FeatureGroup>
            <EditControl position="topright" draw={{ polygon:false, rectangle:false, circle:false, marker:false, polyline:false }} edit={{edit:false, remove:false}} />
          </FeatureGroup>
        )}
      </MapContainer>
    </div>
  );
}