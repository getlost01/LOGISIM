const ram_size = document.querySelector('#ram-size');
const program = document.querySelector('#program');
const pcValue = document.querySelector('#pc-value');
const clockSpeed = document.querySelector('#clock-speed');
const simulate = document.querySelector('#simulate');
const con = document.querySelector('.con');

var T=[false,false,false,false,false,false,false];
var D=[false,false,false,false,false,false,false,false];
let RAM = (r) => [...Array(r)];
let myRam, clocktime;
var address,databit,addressbit;
let AR=0,PC=0,DR=0,AC=0,IR=0,TR=0;
let R=false,I=false;

let Control_Fun=new Map();
Control_Fun.set("R'T0","<p class='p_val'><span class='operation'>R'T0 : </span> AR <- PC <span class='fun_type'>(Fetch Program Counter)</span></p>");
Control_Fun.set("R'T1","<p class='p_val'><span class='operation'>R'T1 : </span> IR <- M[AR] & PC <- PC+1 <span class='fun_type'>(Load program in IR)</span></p>");
Control_Fun.set("R'T2","<p class='p_val'><span class='operation'>R'T2 : </span> D0, D1.....D7 <- Decode(IR([2-14]) & I <- IR[15] & AR <- IR[0-11] <span class='fun_type'>(Decode IR in Opcode , Operand and I)</span></p>");
Control_Fun.set("T0'T1'T2'IEN(FGO+FGI)","<p class='p_val'><span class='operation'>T0'T1'T2'IEN(FGO+FGI) : </span> R <- 1 <span class='fun_type'>(Modify Interrupt Phase)</span></p>");
Control_Fun.set("RT0","<p class='p_val'><span class='operation'>RT0 : </span> AR <- 0 & TR <- PC <span class='fun_type'>(Put PC Value in Temporary Register)</span></p>");
Control_Fun.set("RT1","<p class='p_val'><span class='operation'>RT1 : </span> M[AR] <- TR & PC <- 0 <span class='fun_type'>(Return address at M[0] and make PC empty)</span></p>");
Control_Fun.set("RT2","<p class='p_val'><span class='operation'>RT2 : </span> PC <- PC+1 & IEN <- 0 & R <- 0 & SC <-0 <span class='fun_type'>(Close Interrupt and make R=0)</span></p>");
// Memory Reference
Control_Fun.set("D0T4","<p class='p_val'><span class='operation'>D0T4 : </span> DR <- M[AR] <span class='fun_type'>(Transfer Value From Ram to DR)</span></p>");
Control_Fun.set("D0T5","<p class='p_val'><span class='operation'>D0T5 : </span> AC <- AC^DR & SC <- 0 <span class='fun_type'>(AND Operation completed in ALU)</span></p>");
Control_Fun.set("D1T4","<p class='p_val'><span class='operation'>D1T4 : </span> DR <- M[AR] <span class='fun_type'>(Transfer Value From Ram to DR)</span></p>");
Control_Fun.set("D1T5","<p class='p_val'><span class='operation'>D1T5 : </span> AC <- AC+DR & E <-Cout & SC <- 0 <span class='fun_type'>(ADD Operation completed in ALU)</span></p>");
Control_Fun.set("D2T4","<p class='p_val'><span class='operation'>D2T4 : </span> DR <- M[AR] <span class='fun_type'>(Transfer Value From Ram to DR)</span></p>");
Control_Fun.set("D2T5","<p class='p_val'><span class='operation'>D2T5 : </span> AC <- DR & SC <- 0 <span class='fun_type'>(LDA Operation completed in ALU)</span></p>");
Control_Fun.set("D3T4","<p class='p_val'><span class='operation'>D3T4 : </span> M[AR] <- AC & SC <- 0 <span class='fun_type'>(Storing AC value in RAM)</span></p>");
Control_Fun.set("D4T4","<p class='p_val'><span class='operation'>D4T4 : </span> PC <- AR & SC <- 0 <span class='fun_type'>(Branch Unconditional, jump program to Address AR)</span></p>");
Control_Fun.set("D5T4","<p class='p_val'><span class='operation'>D5T4 : </span> M[AR] <- PC & AR <- AR+1 <span class='fun_type'>(Save the parent Address to return back and increment AR by 1)</span></p>");
Control_Fun.set("D5T5","<p class='p_val'><span class='operation'>D5T5 : </span> PC <- AR & SC <- 0 <span class='fun_type'>(Run program from AR Address)</span></p>");
Control_Fun.set("D6T4","<p class='p_val'><span class='operation'>D6T4 : </span> DR <- M[AR] <span class='fun_type'>(Transfer Value From Ram to DR)</span></p>");
Control_Fun.set("D6T5","<p class='p_val'><span class='operation'>D6T5 : </span> DR <- DR+1 <span class='fun_type'>(Increment DR value to check ISZ condition)</span></p>");
Control_Fun.set("D6T6","<p class='p_val'><span class='operation'>D6T6 : </span> M[AR] <- DR & check if(DR = 0) then (PC <- PC+1) & SC <- 0 <span class='fun_type'>(Checking ISZ Condition)</span></p>");

var ConvertBase = function (num,bit) {
     return {
         from : function (baseFrom) {
             return {
                 to : function (baseTo) {
                     let out = parseInt(num, baseFrom).toString(baseTo);
                     out = out.padStart(bit,'0');
                     return out;
                 }
             };ß
         }
     };
 };

 function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

simulate.addEventListener('click',()=>{
     let temp=ram_size.value.split(" "); 
     address=parseInt(temp[0]); databit=parseInt(temp[1]); addressbit=Math.log2(address);

     temp = "".padStart(Math.log2(databit),"0");
     myRam = RAM(address).fill(temp);
     clocktime = 1000/parseFloat(clockSpeed.value);

     PC = ConvertBase(pcValue.value,databit).from(16).to(2); 

     temp=program.value.split(/[\s, ]+/);
     for (let i = 0; i < temp.length; i+=2) {
         myRam[parseInt(temp[i],16)]=ConvertBase(temp[i+1],databit).from(16).to(2);
     }
    //  console.log(myRam);
     Run_Program();
     
});

let sc=false;
async function Run_Program(){
     let default_halt = "".padStart(Math.log2(databit),"0");
     let pc_itr = parseInt(PC,16),t_itr = 0,d_itr = 0;
     let clocktime_out;
     let inner_html="";
     while(myRam[pc_itr]!=default_halt)
     {
        t_itr = 0;
        d_itr = 0;
        while(t_itr < 7)
        {
            
            clearTimeout(clocktime_out);
            clocktime_out = setTimeout(()=>{

                T.fill(false);
                T[t_itr]=true;
                // console.log(T);
               
                if(!R & T[0])
                {
                    inner_html+=`<p class=p_val>New Operation Started</p>`;
                    inner_html+=Control_Fun.get("R'T0");
                    AR=PC;
                    inner_html+=`<div class="val_row">
                    <div class="val_col change">${ConvertBase(AR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(PC,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(DR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(AC,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(IR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(TR,4).from(2).to(16) }</div> </div>`;
                }
                else if(!R & T[1])
                {
                    inner_html+=Control_Fun.get("R'T1");
                    IR=myRam[parseInt(AR,2)];
                    PC=ConvertBase(parseInt(PC,2)+1,16).from(10).to(2);
                    inner_html+=`<div class="val_row">
                    <div class="val_col">${ConvertBase(AR,4).from(2).to(16) }</div> 
                    <div class="val_col change">${ConvertBase(PC,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(DR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(AC,4).from(2).to(16) }</div> 
                    <div class="val_col change">${ConvertBase(IR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(TR,4).from(2).to(16) }</div> </div>`;
                }
                else if(!R & T[2])
                {
                    inner_html+=Control_Fun.get("R'T2");
                    I = (IR[0] == 1) ? true : false;
                    let Operand = IR.substring(1, 4);
                    let Operation = IR.substring(4,16);
                    D.fill(false);
                    D[parseInt(Operand,2)]=true;
                    AR = Operation;
                    inner_html+=`<p class=p_val>I => ${I} , Opcode => ${Operand} and Operation => ${Operation} </p>`;
                    inner_html+=`<div class="val_row">
                    <div class="val_col change">${ConvertBase(AR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(PC,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(DR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(AC,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(IR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(TR,4).from(2).to(16) }</div> </div>`;
                }
                else 
                {
                    inner_html+=decode_ir();
                }
                con.innerHTML=inner_html;

            },clocktime)
            await sleep(clocktime);
            if(sc){console.log("BREAK");sc=false; break;}
            t_itr++;
        }
        pc_itr=parseInt(PC,2);
        console.log("PC    "+pc_itr);
     }

}

 function decode_ir(){
    let inner_html = "";
    if(!D[7])
    {
        if(D[0])
        {
            if(T[4])
            {
                inner_html+=Control_Fun.get("D0T4");
                DR = myRam[parseInt(AR,2)]; 
                inner_html+=`<div class="val_row">
                    <div class="val_col">${ConvertBase(AR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(PC,4).from(2).to(16) }</div> 
                    <div class="val_col change">${ConvertBase(DR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(AC,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(IR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(TR,4).from(2).to(16) }</div> </div>`;
            }
            if(T[5])
            {
                inner_html+=Control_Fun.get("D0T5");
                AC =ConvertBase((parseInt(AC,2) & parseInt(DR,2)),16).from(10).to(2);
                inner_html+=`<div class="val_row">
                    <div class="val_col">${ConvertBase(AR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(PC,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(DR,4).from(2).to(16) }</div> 
                    <div class="val_col change">${ConvertBase(AC,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(IR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(TR,4).from(2).to(16) }</div> </div>`;
                sc=true;
            }
        }
        else if(D[1])
        {
            if(T[4])
            {
                inner_html+=Control_Fun.get("D1T4");
                DR = myRam[parseInt(AR,2)];
                inner_html+=`<div class="val_row">
                    <div class="val_col">${ConvertBase(AR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(PC,4).from(2).to(16) }</div> 
                    <div class="val_col change">${ConvertBase(DR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(AC,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(IR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(TR,4).from(2).to(16) }</div> </div>`;
            }
            if(T[5])
            {
                inner_html+=Control_Fun.get("D1T5");
                AC =ConvertBase((parseInt(AC,2) + parseInt(DR,2)),16).from(10).to(2);
                inner_html+=`<div class="val_row">
                    <div class="val_col">${ConvertBase(AR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(PC,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(DR,4).from(2).to(16) }</div> 
                    <div class="val_col change">${ConvertBase(AC,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(IR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(TR,4).from(2).to(16) }</div> </div>`;
                sc=true;
            }
        }
        else if(D[2])
        {
            if(T[4])
            {
                inner_html+=Control_Fun.get("D2T4");
                DR = myRam[parseInt(AR,2)];
                inner_html+=`<div class="val_row">
                    <div class="val_col">${ConvertBase(AR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(PC,4).from(2).to(16) }</div> 
                    <div class="val_col change">${ConvertBase(DR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(AC,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(IR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(TR,4).from(2).to(16) }</div> </div>`;
            }
            if(T[5])
            {
                inner_html+=Control_Fun.get("D2T5");
                AC =DR;
                inner_html+=`<div class="val_row">
                    <div class="val_col">${ConvertBase(AR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(PC,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(DR,4).from(2).to(16) }</div> 
                    <div class="val_col change">${ConvertBase(AC,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(IR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(TR,4).from(2).to(16) }</div> </div>`;
                sc=true;
            }
        }
        else if(D[3])
        {
            if(T[4])
            {
                inner_html+=Control_Fun.get("D3T4");
                myRam[parseInt(AR,2)] = AC;
                inner_html+=`<p class=p_val>M[${ConvertBase(AR,4).from(2).to(16)}] = ${ConvertBase(AC,4).from(2).to(16) }</p>`;
                inner_html+=`<div class="val_row">
                    <div class="val_col">${ConvertBase(AR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(PC,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(DR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(AC,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(IR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(TR,4).from(2).to(16) }</div> </div>`;
                sc=true;
            }
        }
        else if(D[4])
        {
            if(T[4])
            {
                inner_html+=Control_Fun.get("D4T4");
                PC = AR;
                inner_html+=`<div class="val_row">
                    <div class="val_col">${ConvertBase(AR,4).from(2).to(16) }</div> 
                    <div class="val_col change">${ConvertBase(PC,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(DR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(AC,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(IR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(TR,4).from(2).to(16) }</div> </div>`;
                sc=true;
            }
        }
        else if(D[5])
        {
            if(T[4])
            {
                inner_html+=Control_Fun.get("D5T4");
                myRam[parseInt(AR,2)] = ConvertBase(parseInt(PC,2)+1,16).from(2).to(2);
                AR = ConvertBase(parseInt(AR,2)+1,16).from(10).to(2);
                inner_html+=`<p class=p_val>M[${ConvertBase(AR,4).from(2).to(16)}] = ${ConvertBase(PC,4).from(2).to(16) }</p>`;
                inner_html+=`<div class="val_row">
                    <div class="val_col change">${ConvertBase(AR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(PC,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(DR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(AC,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(IR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(TR,4).from(2).to(16) }</div> </div>`;
            }
            if(T[5])
            {
                inner_html+=Control_Fun.get("D5T5");
                PC = AR;
                inner_html+=`<div class="val_row">
                    <div class="val_col">${ConvertBase(AR,4).from(2).to(16) }</div> 
                    <div class="val_col change">${ConvertBase(PC,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(DR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(AC,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(IR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(TR,4).from(2).to(16) }</div> </div>`;
                sc=true;
            }
        }
        else if(D[6])
        {
            if(T[4])
            {
                inner_html+=Control_Fun.get("D6T4");
                DR = myRam[parseInt(AR,2)];
                inner_html+=`<div class="val_row">
                    <div class="val_col">${ConvertBase(AR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(PC,4).from(2).to(16) }</div> 
                    <div class="val_col change">${ConvertBase(DR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(AC,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(IR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(TR,4).from(2).to(16) }</div> </div>`;
            }
            if(T[5])
            {
                inner_html+=Control_Fun.get("D6T5");
                DR = ConvertBase(parseInt(DR,2)+1,16).from(10).to(2);
                inner_html+=`<div class="val_row">
                    <div class="val_col">${ConvertBase(AR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(PC,4).from(2).to(16) }</div> 
                    <div class="val_col change">${ConvertBase(DR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(AC,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(IR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(TR,4).from(2).to(16) }</div> </div>`;
            }
            if(T[6])
            {
                inner_html+=Control_Fun.get("D6T6");
                myRam[parseInt(AR,2)] = DR;
                inner_html+=`<p class=p_val>M[${ConvertBase(AR,4).from(2).to(16)}] = ${ConvertBase(DR,4).from(2).to(16) }</p>`;
                if(parseInt(DR,2)===0){
                    PC = ConvertBase(parseInt(PC,2)+1,16).from(10).to(2);
                }
                inner_html+=`<div class="val_row">
                    <div class="val_col">${ConvertBase(AR,4).from(2).to(16) }</div> 
                    <div class="val_col change">${ConvertBase(PC,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(DR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(AC,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(IR,4).from(2).to(16) }</div> 
                    <div class="val_col">${ConvertBase(TR,4).from(2).to(16) }</div> </div>`;
                sc=true;
            }
        }

    }

    return inner_html;
}


// 001 2010
// 002 1011
// 003 3012
// 004 4007
// 007 6012
// 008 5020
// 010 0111
// 011 0222
// 012 0110