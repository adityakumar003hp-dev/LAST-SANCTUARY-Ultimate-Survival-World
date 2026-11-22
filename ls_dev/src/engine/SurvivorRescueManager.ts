import * as THREE from 'three';
import { getTerrainHeight } from './Terrain';

export interface SurvivorDialogue { id:string; name:string; role:string; rescued:boolean; lines:string[]; choices:string[]; }
interface Survivor { id:string; name:string; role:string; position:THREE.Vector3; mesh:THREE.Group; rescued:boolean; following:boolean; }
const PROFILES=[
 {name:'Aarav',role:'Medic',color:0x4d9b78,lines:['I was treating the injured when the evacuation route collapsed.','There are other survivors nearby. We need a safe place and medical supplies.']},
 {name:'Mira',role:'Field Researcher',color:0x7796bd,lines:['I have been documenting the wildlife migration patterns.','Some species only appear in certain biomes and at certain times.']},
 {name:'Kabir',role:'Mechanic',color:0xc28b45,lines:['My radio is dead and the road is blocked.','I can help repair vehicles and generators if you get me to the sanctuary.']},
 {name:'Leah',role:'Scout',color:0xa36caa,lines:['I saw movement near the old research station.','I can mark safe routes and points of interest on your map.']},
];
export class SurvivorRescueManager {
 private scene:THREE.Scene; private seed:number; private survivors:Survivor[]=[]; private rescuedIds=new Set<string>();
 constructor(scene:THREE.Scene,seed:number){this.scene=scene;this.seed=seed;this.spawnInitial();}
 private spawnInitial(){const points=[[34,-28],[-46,38],[72,54],[-82,-65]];points.forEach((p,i)=>{const profile=PROFILES[i];const g=new THREE.Group();g.name=`survivor_${i}`;const cloth=new THREE.MeshStandardMaterial({color:profile.color,roughness:.9});const skin=new THREE.MeshStandardMaterial({color:0xb98262,roughness:.9});const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.23,.48,4,8),cloth);torso.position.y=1.0;torso.castShadow=true;const head=new THREE.Mesh(new THREE.SphereGeometry(.17,10,8),skin);head.position.y=1.42;head.castShadow=true;g.add(torso,head);g.position.set(p[0],getTerrainHeight(p[0],p[1],this.seed),p[1]);this.scene.add(g);this.survivors.push({id:`survivor_${i}`,name:profile.name,role:profile.role,position:g.position.clone(),mesh:g,rescued:false,following:false});});}
 nearest(pos:THREE.Vector3,range=4){let found:Survivor|undefined,dist=range;for(const s of this.survivors){if(s.rescued||s.following)continue;const d=Math.hypot(s.position.x-pos.x,s.position.z-pos.z);if(d<dist){found=s;dist=d;}}return found;}
 getDialogue(id:string):SurvivorDialogue|null{const s=this.survivors.find(x=>x.id===id);if(!s)return null;const p=PROFILES[this.survivors.indexOf(s)];return{id:s.id,name:s.name,role:s.role,rescued:s.rescued,lines:[...p.lines],choices:s.rescued?['Ask about the area','End conversation']:['Help me reach the sanctuary','Ask what happened','Ask about nearby resources']};}
 beginEscort(id:string){const s=this.survivors.find(x=>x.id===id);if(!s||s.rescued||s.following)return false;s.following=true;return true;}
 update(delta:number,player:THREE.Vector3,safeCenter:THREE.Vector3,safeRadius:number){const completed:string[]=[];for(const s of this.survivors){if(!s.following||s.rescued)continue;const offset=new THREE.Vector3(-Math.sin(0)*2,0,3.2);offset.applyAxisAngle(new THREE.Vector3(0,1,0),0);const target=new THREE.Vector3(player.x+offset.x,0,player.z+offset.z);const direction=new THREE.Vector3(target.x-s.position.x,0,target.z-s.position.z);const distance=direction.length();if(distance>0.8){direction.normalize();s.position.addScaledVector(direction,Math.min(distance,delta*3.0));s.mesh.position.copy(s.position);s.mesh.rotation.y=Math.atan2(direction.x,direction.z);}s.position.y=getTerrainHeight(s.position.x,s.position.z,this.seed);s.mesh.position.y=s.position.y;const safeDistance=Math.hypot(s.position.x-safeCenter.x,s.position.z-safeCenter.z);if(safeDistance<safeRadius*0.78){s.rescued=true;s.following=false;s.mesh.visible=false;this.rescuedIds.add(s.id);completed.push(s.id);}}return completed;}
 importRescued(ids:string[]|undefined){if(!ids)return;ids.forEach(id=>{const s=this.survivors.find(x=>x.id===id);if(s){s.rescued=true;s.following=false;s.mesh.visible=false;this.rescuedIds.add(id);}});}
 exportRescued(){return Array.from(this.rescuedIds);}
 get rescuedCount(){return this.rescuedIds.size;}
 get totalCount(){return this.survivors.length;}
 dispose(){for(const s of this.survivors){this.scene.remove(s.mesh);s.mesh.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});}this.survivors=[];}
}
