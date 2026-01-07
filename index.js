// npm i express axios cors body-parser uuid
const express=require('express');
const axios=require('axios');
const cors=require('cors');
const bodyParser=require('body-parser');
const {v4:uuidv4}=require('uuid');

const app=express();
app.use(cors());
app.use(bodyParser.json());

const PORT=process.env.PORT||3000;
const RECEIVE_ADDRESS='TAtCo8tFQQ4fJta9EHnU6m6uEsDp8sdSy7';
const USDT_CONTRACT='TL6pvvYphpWshdqJ99mSZCq9izYqt2evyX';
const USDT_DECIMALS=6;
const ORDER_TTL=30*60*1000;

const orders=new Map();

function genAmount(base){return Number((base+Math.floor(Math.random()*1000)/1000).toFixed(3));}
function genCode(){const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<16;i++)s+=c[Math.floor(Math.random()*c.length)];return s;}
function toUnits(a){return Math.round(a*Math.pow(10,USDT_DECIMALS));}
function isExpired(o){return Date.now()-o.createdAt>ORDER_TTL;}

app.post('/api/order',(req,res)=>{
 const id=uuidv4();
 orders.set(id,{amount:genAmount(Number(req.body.base)),status:'pending',code:null,createdAt:Date.now()});
 const o=orders.get(id);
 res.json({orderId:id,amount:o.amount,address:RECEIVE_ADDRESS});
});

app.get('/api/order/:id',(req,res)=>{
 const o=orders.get(req.params.id);
 if(!o) return res.status(404).json({error:'not found'});
 if(o.status==='pending'&&isExpired(o)) o.status='expired';
 res.json(o);
});

async function poll(){
 try{
  const url=`https://api.trongrid.io/v1/accounts/${RECEIVE_ADDRESS}/transactions/trc20?limit=50&contract_address=${USDT_CONTRACT}`;
  const r=await axios.get(url);
  const txs=r.data.data||[];
  for(const tx of txs){
   const value=Number(tx.value);
   for(const o of orders.values()){
    if(o.status!=='pending') continue;
    if(isExpired(o)){o.status='expired';continue;}
    if(value===toUnits(o.amount)){o.status='paid';o.code=genCode();}
   }
  }
 }catch(e){}
}
setInterval(poll,8000);

app.listen(PORT,()=>console.log('Backend running on',PORT));
