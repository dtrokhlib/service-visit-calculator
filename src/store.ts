import { reactive } from 'vue'
import type { Config, MachineType } from './lib/calculator'
import type { Address, Distance } from './lib/geoapify'
export interface Location { id: number; text: string; machineType: MachineType | ''; address: Address | null; distances: Distance[] | null }
let id=0
export const newLocation=():Location=>({id:++id,text:'',machineType:'HAAS',address:null,distances:null})
export const state=reactive({config:null as Config|null,configError:'',locations:[newLocation()],loading:false,error:'',calculatedAt:''})
