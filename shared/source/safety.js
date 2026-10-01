/* Landit safety directory.
   Verified 5 August 2026 against gov.uk, police.uk, nhs.uk and operators'
   own pages. Four things that make older sources wrong, do not regress them:
     - Action Fraud is now Report Fraud (relaunched 20 Jan 2026), same phone
       0300 123 2040, site reportfraud.police.uk. Scotland reports on 101.
     - The GLAA is gone: labour exploitation goes to the Fair Work Agency
       0345 161 6000 (launched 7 April 2026) or the Modern Slavery Helpline.
     - "Ask for ANI" ENDED November 2024 and must not appear. Safe Spaces runs.
     - Northern Ireland has no 111; power cuts 03457 643 643; gas 0800 002 001.
   Region keys match PROFILE.region, with 'NI' as shorthand for Northern Ireland. */
window.LANDIT_SAFETY = {
  ackKey: 'landed_safety_ack',
  disclaimer: 'Landit provides information only, not legal or financial advice. In immediate danger, call 999.',
  independence: 'Helplines like Victim Support, Rape Crisis and the domestic abuse lines are independent charities. They will not ask about your immigration status, and helping you does not depend on going to the police. Being a victim of crime is never illegal, whatever your status.',
  insecureExtra: 'If you are worried about your status and the police, you can start with a charity helpline instead: they can advise you safely and anonymously. In immediate danger, always call 999.',
  groups: [
    { key:'emergency', label:'Emergency, right now', icon:'siren', items:[
      {id:'999', label:'Police, fire, ambulance, coastguard', number:'999', tel:'999',
       note:'Free, 24/7, any phone. 112 works exactly the same. Location is passed automatically.'},
      {id:'999-lang', label:'No English on a 999 call', number:'Say "Help" then your language', tel:'',
       note:'Say for example "Help, Turkish". The operator connects an interpreter. Stay on the line while it goes quiet.'},
      {id:'999-silent', label:'Cannot speak safely', number:'Call 999, then press 55', tel:'999',
       note:'On a mobile, stay on the line and press 55 when prompted: the call transfers to police. On a landline stay silent; it stays connected about 45 seconds after hanging up.'},
      {id:'999bsl', label:'Deaf or speech-impaired', number:'999 BSL · Relay UK 18000', tel:'18000',
       note:'Video relay at 999bsl.co.uk, no registration. Or register for emergencySMS in advance: text "register" to 999, then text 999 in an emergency.'}
    ]},
    { key:'police', label:'Police, not an emergency', icon:'shield', items:[
      {id:'101', label:'Report a crime that already happened', number:'101', tel:'101',
       note:'Free, whole UK. Also for advice.'},
      {id:'crimestoppers', label:'Report a crime anonymously', number:'0800 555 111', tel:'08005551111',
       note:'Independent charity, not the police. Free, 24/7. They never ask who you are.'},
      {id:'btp', label:'On trains and the Tube', number:'Text 61016', tel:'',
       note:'British Transport Police, discreet. Or call 0800 40 50 40. Emergencies still 999.'},
      {id:'hate', label:'Hate crime', number:'101 · report-it.org.uk', tel:'101',
       note:'999 in an emergency. If it felt targeted at who you are, it counts.'}
    ]},
    { key:'health', label:'Health', icon:'heart-pulse', items:[
      {id:'111', label:'Urgent but not life-threatening', number:'111', tel:'111',
       regions:['England','Scotland','Wales'],
       note:'Free, 24/7. Ask for an interpreter in any language. Mental health crisis: choose the mental health option (Wales: press 2; Scotland: NHS 24 on 111).'},
      {id:'ni-health', label:'Urgent health advice', number:'Your GP, or GP out of hours', tel:'',
       regions:['Northern Ireland'],
       note:'Northern Ireland has no 111 service. In an emergency call 999.'},
      {id:'samaritans', label:'Someone to talk to', number:'116 123', tel:'116123',
       note:'Samaritans. Free, 24/7, works with no phone credit. Or text SHOUT to 85258.'}
    ]},
    { key:'scams', label:'Scams and fraud', icon:'shield-alert', items:[
      {id:'reportfraud', label:'Fraud and online crime', number:'0300 123 2040', tel:'03001232040',
       regions:['England','Wales','Northern Ireland'],
       note:'Report Fraud (reportfraud.police.uk).'},
      {id:'reportfraud-scot', label:'Fraud and online crime', number:'101', tel:'101',
       regions:['Scotland'], note:'In Scotland, fraud is reported to Police Scotland on 101.'},
      {id:'7726', label:'Scam texts', number:'Forward to 7726', tel:'',
       note:'Free. Scam emails: forward to report@phishing.gov.uk.'}
    ]},
    { key:'abuse', label:'Abuse, violence and exploitation', icon:'hand-helping', items:[
      {id:'dahelp', label:'Domestic abuse', number:'0808 2000 247', tel:'08082000247',
       regions:['England'], note:'National Domestic Abuse Helpline. Free, 24/7, interpreters available.'},
      {id:'dahelp-scot', label:'Domestic abuse', number:'0800 027 1234', tel:'08000271234',
       regions:['Scotland'], note:'Free, 24/7.'},
      {id:'dahelp-wales', label:'Domestic abuse', number:'0808 80 10 800', tel:'08088010800',
       regions:['Wales'], note:'Live Fear Free. Free, 24/7. Or text 07860 077 333.'},
      {id:'dahelp-ni', label:'Domestic abuse', number:'0808 802 1414', tel:'08088021414',
       regions:['Northern Ireland'], note:'Free, 24/7.'},
      {id:'mens', label:'Domestic abuse, men', number:'0808 801 0327', tel:'08088010327',
       note:'Men’s Advice Line.'},
      {id:'safespaces', label:'Safe Spaces', number:'Ask in store for the Safe Space', tel:'',
       note:'Boots, Morrisons pharmacies, and Santander, NatWest, HSBC and TSB branches: a private room to call for help.'},
      {id:'rapecrisis', label:'Rape and sexual assault', number:'0808 500 2222', tel:'08085002222',
       regions:['England','Wales'], note:'Rape Crisis. Free, 24/7, 16+.'},
      {id:'rapecrisis-scot', label:'Rape and sexual assault', number:'0808 801 0302', tel:'08088010302',
       regions:['Scotland'], note:'5pm to midnight. Calls do not show on the bill.'},
      {id:'slavery', label:'Modern slavery and forced labour', number:'08000 121 700', tel:'08000121700',
       note:'Free, 24/7, confidential, interpreters. If someone holds your documents, controls your pay, or you cannot leave your job or housing, this is the number.'},
      {id:'fwa', label:'Problems at work', number:'0345 161 6000', tel:'03451616000',
       note:'Fair Work Agency, Mon to Fri 9 to 5. Wages, exploitation, unsafe treatment. Also enforces minimum wage and sick pay.'},
      {id:'victimsupport', label:'After any crime', number:'0808 168 9111', tel:'08081689111',
       note:'Victim Support. Free, 24/7, independent of the police. Help whatever your status, whether or not you report, and you can stay anonymous.'}
    ]},
    { key:'children', label:'Children', icon:'baby', items:[
      {id:'childline', label:'Childline, under 19s', number:'0800 1111', tel:'08001111',
       note:'Free, 24/7. Does not show on the phone bill.'},
      {id:'nspcc', label:'Worried about a child', number:'0808 800 5000', tel:'08088005000',
       note:'NSPCC, 10am to 4pm weekdays. Email any day.'},
      {id:'missing', label:'Missing person', number:'116 000', tel:'116000',
       note:'Missing People, 7 days, 10am to 10pm.'}
    ]},
    { key:'home', label:'Home and consumer', icon:'house', items:[
      {id:'gas', label:'Smell gas', number:'0800 111 999', tel:'0800111999',
       regions:['England','Scotland','Wales'],
       note:'Free, 24/7. Open windows, touch no switches, get out.'},
      {id:'gas-ni', label:'Smell gas', number:'0800 002 001', tel:'0800002001',
       regions:['Northern Ireland'], note:'Free, 24/7. Open windows, touch no switches, get out.'},
      {id:'power', label:'Power cut', number:'105', tel:'105', regions:['England','Scotland','Wales']},
      {id:'power-ni', label:'Power cut', number:'03457 643 643', tel:'03457643643', regions:['Northern Ireland']},
      {id:'consumer', label:'Consumer problems', number:'0808 223 1133', tel:'08082231133',
       regions:['England','Wales'], note:'Citizens Advice consumer helpline. Welsh language: 0808 223 1144.'},
      {id:'consumer-scot', label:'Consumer problems', number:'0808 164 6000', tel:'08081646000',
       regions:['Scotland'], note:'Advice Direct Scotland.'},
      {id:'shelter', label:'Housing and homelessness', number:'0808 800 4444', tel:'08088004444',
       note:'Shelter. Free advice, whatever your status.'}
    ]}
  ],

  /* Contextual "good to know" boxes, keyed to the benefit category the
     person is already reading. Real numbers only. */
  tips: {
    work:    {icon:'hard-hat', text:'If an employer holds your passport, controls your pay, or you cannot leave: <b>Modern Slavery Helpline 08000 121 700</b>, free, confidential, interpreters. Wage problems: <b>Fair Work Agency 0345 161 6000</b>.'},
    money:   {icon:'shield-alert', text:'No real UK organisation asks you to pay by gift card, crypto, or to move money to a "safe account". Scam text? Forward it to <b>7726</b>. Fraud: <b>Report Fraud 0300 123 2040</b>.'},
    housing: {icon:'house', text:'Never pay a deposit before viewing a property and verifying the landlord. Deposits must go into a protection scheme by law. Locked out or threatened by a landlord? That can be a crime: <b>Shelter 0808 800 4444</b>.'},
    council: {icon:'house', text:'Never pay a deposit before viewing a property and verifying the landlord. Deposits must legally go into a protection scheme. Locked out or threatened by a landlord? <b>Shelter 0808 800 4444</b>.'},
    legal:   {icon:'shield-alert', text:'The Home Office never calls to demand payment or to threaten your visa, and never takes payment by gift card or transfer. Hang up and report: <b>0300 123 2040</b>.'},
    health:  {icon:'heart-pulse', text:'<b>111</b> gives NHS advice free, 24/7, and can bring an interpreter into the call. In an emergency, say "Help" plus your language on <b>999</b>.'},
    family:  {icon:'hand-helping', text:'INDEPENDENCE'},
    childcare:{icon:'hand-helping', text:'INDEPENDENCE'},
    welfare: {icon:'phone', text:'Nobody from DWP or HMRC will ever ask you to pay a fee to receive a benefit. If someone does, it is a scam: <b>Report Fraud 0300 123 2040</b>.'},
    energy:  {icon:'zap', text:'Smell gas: <b>0800 111 999</b> (Northern Ireland <b>0800 002 001</b>), free and 24/7. Power cut: <b>105</b> (Northern Ireland <b>03457 643 643</b>).'},
    business:{icon:'shield-alert', text:'Real lenders and real employers never charge a fee up front for a loan, a job or visa sponsorship. If someone does, it is fraud: <b>0300 123 2040</b>.'}
  },

  /* Feature D: the six patterns that target newcomers, mixed with real
     situations so the answer is never automatic. Order is deliberate:
     never two of the same answer three times in a row. */
  scamQuiz: [
    {q:'Someone calls saying they are from the Home Office. Your visa will be cancelled unless you pay today.',
     a:'scam', why:'The Home Office never takes payment by phone, gift card or transfer, and never threatens your visa this way. Hang up and report on 0300 123 2040.'},
    {q:'Your new landlord says your deposit will be held in a government-backed protection scheme called the DPS.',
     a:'real', why:'That is exactly what the law requires. Deposits must go into a protection scheme (DPS, MyDeposits or TDS) within 30 days, and you get a reference to check.'},
    {q:'A letting agent asks for a deposit to hold a flat you have not viewed yet.',
     a:'scam', why:'Never pay before viewing and verifying the landlord. Real deposits are only taken once there is a real tenancy, and they go into a protection scheme.'},
    {q:'Your bank texts you a code and someone on the phone asks you to read it out to "verify your account".',
     a:'scam', why:'Nobody legitimate ever asks for a code you were sent. That code is the key to your account.'},
    {q:'A letter arrives from HMRC saying your tax code changed, with no demand for payment. It asks you to check your payslip.',
     a:'real', why:'Routine and worth acting on: tax code changes come by letter or in your personal tax account, not by threatening phone calls. Checking it can even win you a refund.'},
    {q:'A recruiter offers you a job with visa sponsorship for a £500 "processing fee".',
     a:'scam', why:'Real employers never charge you for a job or for sponsorship. Charging a worker a fee to find work is illegal.'},
    {q:'Someone offers you money to let payments pass through your bank account.',
     a:'scam', why:'That is money muling. It is a crime, and it ends bank accounts and visas, even if you did not know where the money came from.'},
    {q:'Your GP surgery texts a reminder to book a flu jab, telling you to ring the surgery on its usual number.',
     a:'real', why:'Surgeries do send reminders. The tell is what it asks: booking through the number you already know is fine. A text asking for payment or personal details would not be.'},
    {q:'A caller says you owe HMRC tax and police will arrest you within the hour unless you pay by voucher.',
     a:'scam', why:'HMRC does not call to threaten arrest and never takes payment in vouchers. Hang up.'}
  ]
};
