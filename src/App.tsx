import { useEffect, useMemo, useState } from 'react'
import MapaTalhoes from '@/components/MapaTalhoes'
import type { Talhao } from '@/lib/data'
import type { User } from '@/lib/auth'

// IMPORTA AS BIBLIOTECAS DO LEAFLET E DO LEAFLET-DRAW
import 'leaflet/dist/leaflet.css';

type Drone = {
  id: string; nomeInterno: string; modelo: string; fabricante: string;
  numeroSerieOuMatricula?: string; capacidadeTanqueL?: number; larguraFaixaM?: number;
  tipoAplicacaoSuportada: 'liquido' | 'granulado' | 'ambos';
}
type Clima = { temperaturaC?:number; umidadeRelativa?:number; ventoVelKmH?:number; ventoDirecao?:string }

const OPENWEATHER_API_KEY = 'COLOQUE_SUA_OPENWEATHER_API_KEY_AQUI';
const toCardinal = (deg?:number)=>{
  if(deg==null) return undefined;
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'];
  const ix = Math.round(deg/22.5)%16; return dirs[ix];
}

// Usuário simulado (piloto)
const user: User = { role: 'piloto', name: 'Piloto Teste' }

// Talhão fake próximo ao center para teste
const talhoesFake: Talhao[] = [{
  id:'talhao-1',
  nome:'Talhão 01',
  area_ha:2.75,
  geojson:{
    type:'Feature',
    geometry:{ type:'Polygon', coordinates:[[
      [-47.56810,-21.12310],
      [-47.56870,-21.12360],
      [-47.56795,-21.12400],
      [-47.56745,-21.12347],
      [-47.56810,-21.12310]
    ]]},
    properties:{}
  }
}]

const dronesIniciais: Drone[] = [
  { id:'drone-1', nomeInterno:'Drone 01 - T40', modelo:'DJI Agras T40', fabricante:'DJI', tipoAplicacaoSuportada:'liquido' }
]

export default function App(){
  const [selectedTalhao, setSelectedTalhao] = useState<Talhao|null>(null)
  const [clima, setClima] = useState<Clima>({})
  const [isBuscandoClima, setIsBuscandoClima] = useState(false)
  const [drones, setDrones] = useState<Drone[]>(dronesIniciais)
  const [droneId, setDroneId] = useState('')

  // Campos do formulário
  const [clienteNome, setClienteNome] = useState('')
  const [propriedadeNome, setPropriedadeNome] = useState('')
  const [municipio, setMunicipio] = useState('')
  const [uf, setUf] = useState('')
  const [produto, setProduto] = useState('')
  const [ia, setIa] = useState('')
  const [classeTox, setClasseTox] = useState('')
  const [finalidade, setFinalidade] = useState<'herbicida'|'inseticida'|'fungicida'|'adjuvante'|'fertilizante'|'outros'>('herbicida')
  const [dose, setDose] = useState('')
  const [volCalda, setVolCalda] = useState('')
  const [obs, setObs] = useState('')

  const centerTalhao = useMemo(()=>{
    if(!selectedTalhao?.geojson) return undefined
    try{
      const coords = (selectedTalhao.geojson.geometry?.coordinates?.[0]||[]) as number[][]
      if(!coords.length) return undefined
      let sl=0, sg=0; coords.forEach(([lng,lat])=>{ sl+=lat; sg+=lng })
      const n=coords.length; return { lat: sl/n, lng: sg/n }
    }catch{ return undefined }
  }, [selectedTalhao])

  useEffect(()=>{
    const fetchClima = async()=>{
      if(!centerTalhao || !OPENWEATHER_API_KEY || OPENWEATHER_API_KEY.includes('COLOQUE_')) return
      setIsBuscandoClima(true)
      try{
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${centerTalhao.lat}&lon=${centerTalhao.lng}&units=metric&lang=pt_br&appid=${OPENWEATHER_API_KEY}`
        const r = await fetch(url); const j = await r.json()
        const t = j?.main?.temp, h=j?.main?.humidity, w=j?.wind?.speed, d=j?.wind?.deg
        setClima({ temperaturaC:t, umidadeRelativa:h, ventoVelKmH: w!=null? Math.round(w*3.6):undefined, ventoDirecao: toCardinal(d) })
      }finally{ setIsBuscandoClima(false) }
    }
    if(selectedTalhao) fetchClima()
  }, [selectedTalhao])

  const salvar = ()=>{
    if(!selectedTalhao){ alert('Selecione um talhão no mapa.'); return }
    if(!clienteNome || !propriedadeNome || !droneId || !produto || !dose){
      alert('Preencha os campos obrigatórios: cliente, propriedade, drone, produto, dose.'); return
    }
    const drone = drones.find(d=>d.id===droneId)!
    const op = {
      id:`op-${Date.now()}`,
      status:'PENDENTE_DE_VALIDACAO',
      clienteNome, propriedadeNome, municipio:municipio||undefined, uf:uf||undefined,
      talhaoId:selectedTalhao.id, talhaoNome:(selectedTalhao as any).nome||selectedTalhao.id,
      droneId:drone.id, droneNomeInterno:drone.nomeInterno, droneModelo:drone.modelo,
      produtoNomeComercial:produto, ingredienteAtivo:ia||undefined, classeToxicologica:classeTox||undefined,
      finalidade, dosePorHa:dose, volumeCaldaLporHa:volCalda||undefined,
      observacoes:obs||undefined, clima, pilotoNome:user.name, dataHoraCriacaoISO:new Date().toISOString()
    }
    console.log('OPERACAO:', op)
    alert('Operação salva (simulada). Veja o console.')
  }

  return (
    <div style={{position:'relative', width:'100%', height:'100%'}}>
      <div className="hdr">Heins Agrotech</div>
      <div className="note">👆 Toque em um polígono para selecionar</div>
      <div style={{position:'absolute', inset:0}}>
        <MapaTalhoes user={user} talhoes={talhoesFake} readOnly={true} onTalhaoSelect={(t)=>setSelectedTalhao(t)} selectedTalhaoId={selectedTalhao?.id}/>
      </div>

      {selectedTalhao && (
        <div className="sheet" style={{padding:'12px 14px'}}>
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
            <span className="tag">Talhão: <b style={{marginLeft:6}}>{(selectedTalhao as any).nome || selectedTalhao.id}</b></span>
            {isBuscandoClima && <span className="tag" style={{background:'#fef3c7', color:'#92400e'}}>Buscando clima…</span>}
          </div>

          <div style={{display:'grid', gap:10, gridTemplateColumns:'1fr 1fr'}}>
            <div><span className="label">Cliente*</span><input className="input" value={clienteNome} onChange={e=>setClienteNome(e.target.value)} placeholder="Nome do cliente"/></div>
            <div><span className="label">Propriedade*</span><input className="input" value={propriedadeNome} onChange={e=>setPropriedadeNome(e.target.value)} placeholder="Fazenda XYZ"/></div>
            <div><span className="label">Município</span><input className="input" value={municipio} onChange={e=>setMunicipio(e.target.value)} placeholder="Cidade"/></div>
            <div><span className="label">UF</span><input className="input" value={uf} onChange={e=>setUf(e.target.value)} placeholder="SP"/></div>
          </div>

          <div className="panel" style={{marginTop:10}}>
            <div style={{display:'grid', gap:10, gridTemplateColumns:'1fr 1fr'}}>
              <div>
                <span className="label">Drone*</span>
                <select className="input" value={droneId} onChange={e=>setDroneId(e.target.value)}>
                  <option value="">— Selecione —</option>
                  {drones.map(d=>(<option key={d.id} value={d.id}>{d.nomeInterno} — {d.modelo}</option>))}
                </select>
              </div>
              <div>
                <span className="label">Produto (nome comercial)*</span>
                <input className="input" value={produto} onChange={e=>setProduto(e.target.value)} placeholder="Ex: Herbicida X"/>
              </div>
              <div>
                <span className="label">Ingrediente ativo</span>
                <input className="input" value={ia} onChange={e=>setIa(e.target.value)} placeholder="Ex: Glifosato"/>
              </div>
              <div>
                <span className="label">Classe toxicológica</span>
                <input className="input" value={classeTox} onChange={e=>setClasseTox(e.target.value)} placeholder="Ex: Classe II"/>
              </div>
              <div>
                <span className="label">Finalidade</span>
                <select className="input" value={finalidade} onChange={e=>setFinalidade(e.target.value as any)}>
                  <option value="herbicida">Herbicida</option>
                  <option value="inseticida">Inseticida</option>
                  <option value="fungicida">Fungicida</option>
                  <option value="adjuvante">Adjuvante</option>
                  <option value="fertilizante">Fertilizante</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
              <div>
                <span className="label">Dose por hectare*</span>
                <input className="input" value={dose} onChange={e=>setDose(e.target.value)} placeholder="Ex: 2.5 L/ha"/>
              </div>
              <div>
                <span className="label">Volume de calda</span>
                <input className="input" value={volCalda} onChange={e=>setVolCalda(e.target.value)} placeholder="Ex: 15 L/ha"/>
              </div>
            </div>
          </div>

          <div className="panel" style={{marginTop:10}}>
            <div style={{display:'grid', gap:10, gridTemplateColumns:'repeat(4,1fr)'}}>
              <div><span className="label">Temp (°C)</span><input className="input" value={clima.temperaturaC ?? ''} readOnly/></div>
              <div><span className="label">Umidade (%)</span><input className="input" value={clima.umidadeRelativa ?? ''} readOnly/></div>
              <div><span className="label">Vento (km/h)</span><input className="input" value={clima.ventoVelKmH ?? ''} readOnly/></div>
              <div><span className="label">Direção</span><input className="input" value={clima.ventoDirecao ?? ''} readOnly/></div>
              {!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY.includes('COLOQUE_') ? (
                <div style={{gridColumn:'1/-1', color:'#92400e', background:'#fef3c7', padding:8, borderRadius:8}}>
                  ⚠️ Configure sua OpenWeather API Key no código para capturar clima automaticamente.
                </div>
              ): null}
            </div>
          </div>

          <div style={{display:'grid', gap:10, marginTop:10}}>
            <div>
              <span className="label">Observações</span>
              <textarea className="input" rows={3} value={obs} onChange={e=>setObs(e.target.value)} placeholder="Observações de segurança, alvos próximos, etc."/>
            </div>
            <button className="btn" onClick={salvar}>Salvar Operação (PENDENTE DE VALIDAÇÃO)</button>
          </div>
          <div style={{height:8}}/>
        </div>
      )}
    </div>
  )
}