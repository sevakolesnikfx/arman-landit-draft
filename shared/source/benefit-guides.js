/* Landit application guides.
   One guide per scheme in assets/benefits-data.js. Written from
   docs/Landed_benefits_research_2026-08-05.md and the catalog (verified
   5 August 2026, 2026/27 rates). Fields:
     time     how long the application itself takes
     decision how long the decision takes
     cost     what it costs to apply
     need     what to gather before starting
     steps    how to apply, in order
     boost    how to improve the chances of a yes
     watch    the mistake that most often costs people the claim
   Anything not evidenced in the research is left out rather than invented. */
window.LANDIT_GUIDES = {

/* ---------- legal status actions ---------- */
'coc-lift-nrpf': {
  time:'2 to 4 hours, mostly gathering statements', decision:'34 days on Home Office figures, up to 93 days on independent analysis', cost:'Free',
  need:['Bank statements for EVERY account you hold, most recent 6 months','Proof of income and all outgoings','Evidence of your accommodation and any rent arrears','For the child-welfare ground: evidence about your children'],
  steps:['Check your route qualifies: family, private life or BN(O). Work and study routes only in particularly compelling circumstances.','Pick your ground: you are destitute, at risk of destitution within 3 months, there are compelling child-welfare reasons, or exceptional financial circumstances.','Download the change of conditions form from GOV.UK and complete it in full.','Disclose every bank account you hold. Missing one is the most common reason for refusal.','Attach a short covering letter explaining your situation in plain terms and listing your evidence.','Submit online and keep the confirmation.'],
  boost:['Ask for Tier 1 priority (72 working hours) if you are street homeless or at serious risk, Tier 2 (14 working days) for other serious vulnerability.','Explain every large or unusual transaction in your statements before a caseworker has to ask.','Get free advice first if you are on the 5-year family route: a grant can move you to the 10-year route.','Write about your children specifically: their school, health, and what going without means for them.'],
  watch:'Leaving out an account you barely use. Caseworkers cross-check, and an undisclosed account reads as concealment.'
},
'fee-waiver': {
  time:'2 to 3 hours', decision:'Historically 69 to 168 days', cost:'Free (it waives about £3,900 per adult)',
  need:['6 months of bank statements for every account','Payslips or proof of any income','Rent, bills and childcare costs','Details of anyone supporting you financially'],
  steps:['Confirm your route: family (5 or 10 year), private life, discretionary leave, BN(O) or trafficking victim.','Complete the fee waiver request as part of your extension application on GOV.UK.','Set out your income, then your essential living costs, and show what is left.','Upload 6 months of statements for every account.','Submit BEFORE your current leave expires so section 3C protection continues.'],
  boost:['You do not have to be destitute. Being unable to afford the fee and health surcharge after essential costs is enough: say so plainly.','Explain every transaction over £250. Caseworkers are instructed to query them.','Disability benefits are disregarded from the income assessment, so do not let them count against you.'],
  watch:'Applying after your leave has expired. You lose 3C protection and your status with it.'
},
'nino': {
  time:'About 15 minutes', decision:'Up to 4 weeks', cost:'Free',
  need:['Your passport or eVisa share code','Your UK address'],
  steps:['Check your BRP first: some already show a National Insurance number, in which case you do not need to apply.','Apply on GOV.UK. It is online only.','Upload identity evidence when asked.','Wait for the letter. You can start work before it arrives using your eVisa share code.'],
  boost:['Give an address where post reliably reaches you, and tell them promptly if you move.','Start work without waiting: your employer can use a temporary reference.'],
  watch:'Paying a third-party website. The application is free on GOV.UK and no one can speed it up for money.'
},

/* ---------- health ---------- */
'gp-registration': {
  time:'15 minutes', decision:'Usually same day to 2 weeks', cost:'Free',
  need:['Nothing is legally required'],
  steps:['Find a practice near you on the NHS website.','Ask to register. Fill in form GMS1 at reception or online.','If you have no proof of address or ID, say so and ask to register anyway: NHS policy allows it.','If you are homeless, you may use the surgery address.'],
  boost:['If you are turned away, ask for the refusal in writing with the reason. Practices can only refuse if the list is closed or you are outside the area.','Register before you are ill: it is the gateway to nearly everything else in the NHS.'],
  watch:'Accepting "we need ID and proof of address" as final. It is not a legal requirement.'
},
'nhs-low-income-scheme': {
  time:'30 to 45 minutes', decision:'About 18 working days', cost:'Free',
  need:['Income evidence (payslips, student finance letter, or a statement of no income)','Rent or mortgage costs','Savings balances (must be under £16,000)','Details of everyone in your household'],
  steps:['Apply online at the NHS help with health costs service, or ask a pharmacy or GP for paper form HC1.','List all household income for the assessment period.','Include your rent and council tax: these raise your assessed requirements and improve your result.','Submit and wait for your certificate: HC2 is full help, HC3 is partial.'],
  boost:['Students: your income during term time is usually low enough. Apply during the course, not the summer.','Include every housing cost you pay. People routinely under-report rent and end up with HC3 instead of HC2.','Reapply when the certificate expires, and after any drop in income.'],
  watch:'Paying for dental work before your certificate arrives. Ask the dentist to wait, or keep receipts and claim the refund with form HC5 within 3 months.'
},
'matex': {
  time:'5 minutes', decision:'Usually within 2 weeks', cost:'Free',
  need:['Your pregnancy confirmation'],
  steps:['At your booking appointment, ask the midwife for a maternity exemption certificate (form FW8).','The midwife or GP signs and submits it for you.','Your certificate arrives by post: it covers pregnancy and the 12 months after birth.'],
  boost:['Ask at the first appointment. It is issued on pregnancy alone, with no income or status test.','Use it for NHS dental too, not just prescriptions: a Band 3 course is £332.10 otherwise.'],
  watch:'Forgetting to use it after the birth. It runs for a full 12 months from your due date.'
},

/* ---------- education and children ---------- */
'fsm-england-nrpf': {
  time:'20 minutes', decision:'Days to a few weeks', cost:'Free',
  need:['Proof of income (payslips or a statement of your circumstances)','Evidence of savings under £16,000','Your child\'s school details','Your immigration documents'],
  steps:['Apply through your child\'s school or your council: ask for the NRPF free school meals route by name.','Check the income cap for your area: £22,700 (1 child) or £26,300 (2+) outside London, £31,200 or £34,800 in London.','Submit income and savings evidence.','Once approved, ask the school to confirm it is registered.'],
  boost:['Register even if your child is in reception to year 2 and already gets meals automatically: registration unlocks pupil premium funding and other FSM-linked help like uniform grants.','From September 2026 every child in a Universal Credit household qualifies too, so re-apply if your status changes.'],
  watch:'Assuming NRPF blocks you. There is a dedicated Department for Education route specifically for families with no recourse.'
},
'breakfast-clubs': {
  time:'One conversation', decision:'Immediate', cost:'Free',
  need:['Nothing'],
  steps:['Ask your child\'s school whether it runs a free breakfast club: about 2,750 primaries do.','Sign your child up through the school office.','Turn up: at least 30 minutes of free childcare with breakfast before school.'],
  boost:['If your school does not run one yet, ask when it is joining: the rollout is continuing.'],
  watch:'Nothing to watch: there is no application, means test or status test.'
},
'childcare-15h-universal': {
  time:'One conversation with a nursery', decision:'Starts the term after the third birthday', cost:'Free',
  need:['Your child\'s birth certificate or passport'],
  steps:['Find a nursery, preschool or childminder that takes funded places.','Tell them you want the universal 15 hours for 3 and 4 year olds.','Complete their form. There is no council application and no eligibility code.','Your place starts the term after your child turns 3.'],
  boost:['Ring around a term early: good settings fill their funded places.','Ask whether they charge for extras like meals or nappies, and what the total will be.'],
  watch:'Being told you need immigration status or a work test. This entitlement has neither.'
},
'childcare-2yo-nrpf': {
  time:'30 minutes', decision:'Several weeks (councils verify)', cost:'Free',
  need:['Proof of income','Evidence of savings under £16,000','Your child\'s birth certificate','Your immigration documents or asylum support letter'],
  steps:['Contact your council\'s early years team and ask for the NRPF 2 year old form.','Check the income cap: £26,500 (1 child) or £30,600 (2+) outside London, £34,500 or £38,600 in London.','Submit the form with income and savings evidence.','Once approved you get a code: take it to a nursery or childminder.'],
  boost:['Apply the term BEFORE you need the place. Councils take weeks to verify NRPF applications.','Families on section 95, 98 or 4 asylum support qualify: say so on the form.'],
  watch:'Going to the nursery first. Unlike the universal 15 hours, this one starts with the council.'
},
'childcare-30h-partner': {
  time:'20 minutes', decision:'Usually instant to 7 days', cost:'Free',
  need:['Both partners\' National Insurance numbers','Both partners\' income details','Your child\'s details'],
  steps:['The partner WITH recourse must be the applicant: an NRPF parent cannot apply alone.','Both of you must meet the work test: each earning at least £2,643.68 per quarter, neither over £100,000.','Apply through the childcare account on GOV.UK.','Give the code you receive to your childcare provider.','Reconfirm every 3 months or the code lapses.'],
  boost:['Including an NRPF partner on the application does not breach their visa conditions: the NRPF Network confirms this.','Set a calendar reminder for the 3-month reconfirmation. Missed reconfirmations are the main reason places are lost.'],
  watch:'Single parents with NRPF and couples where both have NRPF are excluded. Check the partner rule before counting on this.'
},
'tax-free-childcare': {
  time:'20 minutes', decision:'Usually instant', cost:'Free',
  need:['Both partners\' National Insurance numbers','Income details','Your child\'s details'],
  steps:['Open a childcare account on GOV.UK (the same account as the 30 hours).','The partner with recourse applies, following the same partner rule.','Pay money into the account: the government adds £2 for every £8, up to £2,000 per child per year.','Pay your provider from the account.'],
  boost:['Pay in early in the quarter so the top-up is there when the bill arrives.','If your child is disabled the cap is £4,000 a year, not £2,000.'],
  watch:'You cannot use this alongside the Universal Credit childcare element. Work out which is worth more before opening it.'
},
'esol-funding': {
  time:'One visit to a college', decision:'Enrolment at term start', cost:'Free if eligible',
  need:['Proof of address','Proof of income or benefit status','Your immigration documents'],
  steps:['Find your local further education college or search the National Careers Service course finder.','Ask for a free ESOL assessment: they place you at the right level.','Show income evidence: courses are fully funded if you are unemployed or earning under £26,800.','Enrol for the term.'],
  boost:['Refugees, Ukraine and BN(O) arrivals qualify from day one.','Sponsored Skilled Worker and Student visa holders are excluded from adult skills funding, but council and charity classes stay open: ask the college who runs free classes locally.'],
  watch:'Assuming a "no" from one college is the final answer. Charity and community ESOL has no status test at all.'
},
'uni-hardship-fund': {
  time:'1 to 2 hours', decision:'Typically 2 to 6 weeks', cost:'Free',
  need:['3 months of bank statements','A budget: income in, essential costs out','Evidence of what changed (job loss, family emergency, unexpected bill)','Your enrolment details'],
  steps:['Search "[your university] hardship fund" and find the student funding or wellbeing team.','Check whether there is a separate international student fund: most universities now run one.','Complete the application with a clear budget showing the shortfall.','Attach bank statements and evidence of the unexpected cost.','Submit and follow up with the student union adviser if you hear nothing.'],
  boost:['Be specific about the event that caused the shortfall. "My hours were cut in March" beats "I am struggling".','Show you have already cut what you can: it demonstrates the gap is real.','Ask the adviser to read your draft before you submit. They know what their panel funds.','Sector awards typically run £500 to £3,000, so do not undersell what you need.'],
  watch:'Ask whether the award is a gift or a repayable loan BEFORE you accept it.'
},
'kings-trust': {
  time:'1 hour plus a conversation', decision:'A few weeks', cost:'Free',
  need:['Proof of age (16 to 30)','Details of the course, tools or licence you need','A quote or price for the item'],
  steps:['Go to the King\'s Trust website and find Development Awards.','Explain the specific barrier: a course fee, tools, a licence, or travel to a new job.','Get a quote for exactly what you need.','Submit and speak to the adviser who contacts you.'],
  boost:['Tie the request to a concrete outcome: "this licence gets me this job" lands better than a general request.','Ask about the Enterprise programme too if you want to start a business: free course, mentor, and grants.'],
  watch:'You must be studying under 14 hours a week, or unemployed or working under 16 hours, to qualify.'
},

/* ---------- work and money ---------- */
'ssp': {
  time:'One conversation with your employer', decision:'Paid through payroll', cost:'Free',
  need:['A fit note from your GP if you are off more than 7 days'],
  steps:['Tell your employer you are sick, following their notification rules.','Get a fit note from your GP if the absence goes past 7 days.','Statutory Sick Pay is paid through payroll: £123.25 a week, or 80% of your average earnings if that is lower.','Since April 2026 it is paid from day one with no earnings floor.'],
  boost:['If your employer refuses, ask for form SSP1 in writing with the reason. That form is also what supports an ESA claim.','The Fair Work Agency enforces SSP: escalate to them if the refusal is wrong.'],
  watch:'Agency and part-time workers often assume they are excluded. Since April 2026 they are not.'
},
'smp': {
  time:'One conversation plus a form', decision:'Confirmed by your employer', cost:'Free',
  need:['MATB1 certificate from your midwife or GP','Notice to your employer by the 15th week before the due date'],
  steps:['Get your MATB1 from the midwife at around 20 weeks.','Tell your employer at least 15 weeks before your due date, in writing.','Give them the MATB1.','SMP pays 90% of earnings for 6 weeks, then £194.32 a week for 33 weeks.'],
  boost:['You need 26 weeks with the same employer by the 15th week before the due date, and earnings of at least £129 a week.','If you do not qualify, your employer must give you form SMP1: that form is what unlocks Maternity Allowance instead.'],
  watch:'Missing the 15-week notice deadline. Put it in your calendar as soon as you know your due date.'
},
'maternity-allowance': {
  time:'45 minutes', decision:'Usually within 24 working days', cost:'Free',
  need:['MATB1 certificate','Payslips or accounts covering the 66 weeks before your due date','Form SMP1 if your employer refused SMP','Your National Insurance number'],
  steps:['Download form MA1 from GOV.UK.','Work back 66 weeks from your due date and list every week you worked, in any job.','You need 26 of those weeks worked, and earnings of £30+ a week in any 13 of them.','Attach your MATB1, evidence of earnings, and the SMP1 if you have one.','Post it to the address on the form.'],
  boost:['The 26 weeks do NOT have to be consecutive, or with one employer. Count agency shifts, self-employment and short jobs: people miss thousands by only counting their current job.','This is confirmed as not a public fund, so it is safe with NRPF conditions. Up to £7,578 over 39 weeks.','Apply as soon as you are 26 weeks pregnant: payment can start 11 weeks before the due date.'],
  watch:'Assuming that being refused SMP means no maternity pay at all. Maternity Allowance is the fallback and it is the largest NRPF-safe payment there is.'
},
'pension-auto-enrolment': {
  time:'Nothing to do', decision:'Automatic', cost:'Free',
  need:['Nothing'],
  steps:['If you are 22 or over and earn £10,000+, your employer must enrol you automatically.','Check your payslip for a pension deduction and an employer contribution.','Your employer must add at least 3% of qualifying earnings: roughly £713 a year on a £30,000 salary.'],
  boost:['Do not opt out. Opting out throws away the employer money, not just your own contribution.','Leaving the UK does not forfeit the pot: keep your provider updated with your address.','If you are under 22 or earn less, you can usually ask to opt IN.'],
  watch:'Opting out to boost take-home pay. You lose the employer contribution permanently for those months.'
},
'tax-refund': {
  time:'20 minutes', decision:'5 days to 8 weeks', cost:'Free',
  need:['Your payslips or P45','Your National Insurance number','A Government Gateway account'],
  steps:['Check the tax code on your payslip. 1257L W1/M1, BR or 0T usually means you are overpaying.','For a past year, HMRC often issues a P800 refund automatically: check your personal tax account.','If you stopped work mid-year, submit form P50.','If you are leaving the UK, submit form P85.','Claims can go back 4 tax years.'],
  boost:['Check your first payslip in every new job. Emergency tax codes are the single most common newcomer overpayment.','Do it yourself on GOV.UK: refund companies take up to 40% for filling in the same free form.'],
  watch:'Signing up with a "tax refund agent" who takes a cut. The claim is free and takes 20 minutes.'
},
'marriage-allowance': {
  time:'10 minutes', decision:'Within 2 months', cost:'Free',
  need:['Both National Insurance numbers','Both dates of birth','A form of ID for the lower earner'],
  steps:['Confirm one of you earns under the personal allowance and the other is a basic-rate taxpayer.','The LOWER earner makes the claim on GOV.UK.','Transfer £1,260 of unused personal allowance to your partner.','Backdate it up to 4 years in the same application.'],
  boost:['Backdating 4 years is worth about £1,000 in one go. Always tick it.','This is very relevant where a dependant partner is not yet working: it turns unused allowance into cash.'],
  watch:'Using a paid claims site. It is free on GOV.UK and takes ten minutes.'
},
'new-style-jsa': {
  time:'30 minutes', decision:'About 2 weeks', cost:'Free',
  need:['National Insurance number','Employment history for the last 2 tax years','Bank details'],
  steps:['Check you have Class 1 National Insurance contributions in the last 2 complete tax years: realistically year 2 to 3 in the UK.','Apply on GOV.UK for New Style Jobseeker\'s Allowance.','Attend the phone or Jobcentre appointment.','It pays £95.55 a week at 25+ for up to 182 days.'],
  boost:['Your savings and your partner\'s income are ignored: do not rule yourself out because you have savings.','This is not a public fund. Claiming it never breaches NRPF conditions.'],
  watch:'If you are on a sponsored work visa, losing that job has visa consequences separate from the benefit. Get immigration advice at the same time.'
},
'new-style-esa': {
  time:'30 minutes', decision:'Assessment can take several weeks', cost:'Free',
  need:['Fit note from your GP','National Insurance number','Employment history for the last 2 tax years'],
  steps:['Claim on GOV.UK for New Style Employment and Support Allowance.','Send fit notes to cover the whole period.','Complete the capability for work questionnaire when it arrives.','Attend the assessment if you are asked to.'],
  boost:['Claim the day your Statutory Sick Pay ends (week 28): the periods link together and you avoid a gap.','Self-employed Class 2 contributions count for ESA, unlike JSA.','Describe your worst days, not your best: the assessment asks what you can do reliably and repeatedly.'],
  watch:'Letting fit notes lapse. A gap in fit notes stops payment.'
},

/* ---------- family safety net ---------- */
's17-children-act': {
  time:'A phone call, then an assessment', decision:'Assessment should be prompt; interim help can start immediately', cost:'Free',
  need:['Evidence of your children (birth certificates, school letters)','Evidence of your immigration status','Evidence of your finances and housing situation'],
  steps:['Contact your council\'s children\'s services front door. Out of hours, ask for the emergency duty team.','Say clearly: "I am a parent with no recourse to public funds, my children are at risk of destitution, and I am requesting a section 17 assessment."','Ask for the request to be logged in writing and get a reference.','Cooperate with the child in need assessment.','Support can include accommodation and subsistence.'],
  boost:['Put the request in writing as well as by phone, and keep a copy.','Ask explicitly for INTERIM support while the assessment is carried out: councils can and do provide it.','If you are refused because of your immigration status, that is unlawful: contact Project 17 or Together with Migrant Children.'],
  watch:'Being turned away at the front desk. Councils must assess any child in need regardless of the family\'s immigration status.'
},
'healthy-start-nrpf': {
  time:'20 minutes', decision:'5 working days on the NRPF route', cost:'Free',
  need:['Your child\'s British passport or birth certificate','Proof of earned income of £408 a month or less'],
  steps:['Check the NRPF route requirements: at least one BRITISH child under 4, and earned income of £408 a month or less after tax.','Email healthystartnrpf@nhsbsa.nhs.uk to apply on the NRPF route.','Send the evidence they ask for.','Your prepaid card arrives: £4.65 a week per child aged 1 to 4, £9.30 a week per baby under 1.'],
  boost:['Ask about free Healthy Start vitamins at the same time: they come with the scheme.','If you have recourse instead, use the standard route with Universal Credit and earnings of £408 a month or less.'],
  watch:'The NRPF extension does not currently cover pregnant women or non-British children. In Scotland, Best Start Foods is far more generous and open to NRPF.'
},
'best-start-foods': {
  time:'30 minutes', decision:'Usually within 3 weeks', cost:'Free',
  need:['Your child\'s birth certificate','Proof of income','Your Scottish address'],
  steps:['Apply at mygov.scot for Best Start Foods.','If you have no recourse to public funds, say so: there is a dedicated route. On the phone, use the words "I have no access to public funds".','Income limits: £1,878.22 a month single, £2,223.24 a couple, after tax.','Your prepaid card arrives: £5.60 a week in pregnancy and ages 1 to 3, £11.20 a week per baby under 1.'],
  boost:['Apply for Best Start Grant at the same time on the same form if you have recourse: the payments stack.','Asylum seekers are explicitly included. Do not be put off by benefit language on the form.','Ask your midwife about free pregnancy vitamins too: in Scotland they are free for everyone.'],
  watch:'Assuming Scottish schemes follow the same NRPF rules as England. Best Start Foods was deliberately opened up.'
},
'sure-start-maternity-grant': {
  time:'30 minutes', decision:'Within a few weeks', cost:'Free',
  need:['Form SF100','Your MATB1 or the baby\'s birth certificate','Confirmation of your qualifying benefit','A health professional to countersign'],
  steps:['Check you are on a qualifying benefit such as Universal Credit.','Get form SF100 from GOV.UK.','Ask your midwife, health visitor or doctor to sign the health professional section.','Send it in within the window: 11 weeks before the due date to 6 months after the birth.'],
  boost:['It is £500 for a first baby, paid once, and it is not repayable.','Newly granted refugees with a baby under 6 months should claim as soon as Universal Credit starts: the 6-month window is strict.','In Scotland, claim Best Start Grant instead: it pays for every child, not just the first.'],
  watch:'Missing the 6-month deadline after birth. There is no discretion to extend it.'
},

/* ---------- council ---------- */
'council-tax-student': {
  time:'20 minutes', decision:'2 to 6 weeks', cost:'Free',
  need:['Student certificate from your university (free, ask the registry)','Your tenancy agreement','Share code for a non-working spouse or dependant'],
  steps:['Get a council tax student certificate from your university: it is free and usually instant online.','Find your council\'s council tax discount page.','Apply for the Class N student exemption. If everyone in the household is a student, the bill is zero.','Upload the certificate and your tenancy.','Ask for it to be backdated to your course or tenancy start date.'],
  boost:['The exemption also covers the non-British spouse or dependant of a full-time student who cannot work or claim under their visa: include them and send their share code.','Always ask for backdating. Councils do backdate with evidence, and that can be a year or more of bills.','You need a course of 1 year or more, and 21+ study hours a week.'],
  watch:'Do not confuse this with Council Tax Reduction, which is a public fund and blocked under NRPF. This exemption is based on who lives in the property, not income, so it is NRPF-safe.'
},
'single-person-discount': {
  time:'10 minutes', decision:'Usually within 2 weeks', cost:'Free',
  need:['Your council tax account number','Your tenancy or address details'],
  steps:['Find your council\'s council tax discount page.','Apply for the single person discount: 25% off if you are the only adult in the property.','Give the date you started living alone.'],
  boost:['Ask for backdating to the date the other adult moved out.','Some occupants are "disregarded" (students, carers, under-18s), which can mean a 25% or even 50% discount even if you are not alone.'],
  watch:'Tell the council promptly if someone moves in. Overpaid discounts are recovered and can be treated as fraud.'
},
'daf-wales-eap': {
  time:'20 minutes by phone or online', decision:'Usually 1 working day', cost:'Free',
  need:['Your address and situation','Details of the emergency'],
  steps:['Apply online at gov.wales or ring 0800 859 5924.','Ask for an Emergency Assistance Payment for food, gas, electricity or emergency travel.','Explain the crisis clearly and what you need the money for.','Decisions usually come within one working day.'],
  boost:['Welsh guidance explicitly says people with no recourse to public funds are eligible for the EAP. Say so up front if a call handler hesitates.','You can get up to 3 payments in 12 months, 7 days apart.','Asylum seekers are included.'],
  watch:'The white goods arm (Individual Assistance Payment) is benefit-gated and closed to NRPF. The emergency cash arm is not.'
},
'crf-england': {
  time:'30 minutes', decision:'Varies by council', cost:'Free',
  need:['Proof of income and your situation','Your address','Evidence of the crisis'],
  steps:['Find your upper-tier council on GOV.UK and go to its Crisis and Resilience Fund page.','Apply for the help you need: vouchers, energy top-ups, food or white goods.','Provide evidence of income and the crisis.'],
  boost:['Around 60% of applications to the predecessor scheme were awarded, averaging £214: it is worth applying.','If you have no recourse, the standard route is closed, but ask the council to consider help under section 17 Children Act, the Care Act or public health powers, and ask them to confirm in writing which legal power they used.'],
  watch:'48 councils covering nearly a third of England ran no scheme at all in 2024/25. Check yours exists before relying on it.'
},

/* ---------- food and essentials ---------- */
'trussell-food-banks': {
  time:'One phone call', decision:'Same day', cost:'Free',
  need:['Nothing. No ID or immigration check.'],
  steps:['Ring Help through Hardship free on 0808 208 2138: it is the fastest route to a voucher.','Or ask any of these for a referral: Citizens Advice, your GP, your child\'s school, a social worker, the council.','Take the voucher to the food bank at its opening time.','You receive at least 3 days of emergency food.'],
  boost:['The Help through Hardship line also checks what else you are missing and can refer you onward: it is worth the call even if you already have a voucher.','Ask for a fuel voucher at the same appointment: many food banks issue Fuel Bank Foundation vouchers.','Independent food banks (774 of them) often accept self-referral with no voucher at all.'],
  watch:'Nothing: there is no immigration check anywhere in this system.'
},

/* ---------- utilities ---------- */
'community-fibre-essential': {
  time:'15 minutes', decision:'Install within days', cost:'£12.50 a month',
  need:['Your London address'],
  steps:['Check coverage at your postcode on the Community Fibre website.','Order the 35 Mbit/s Essential package at £12.50 a month.','Book the installation slot.'],
  boost:['No benefit check and no supporting documents: this is the tariff an NRPF household can actually get.','If you are outside Community Fibre\'s network, check whether your building is on the 4th Utility network: their £13.99 social tariff also asks for no documentation.'],
  watch:'Check your existing contract\'s exit fees before switching, though social tariff switches are often fee-free.'
},
'broadband-social-tariffs': {
  time:'20 minutes', decision:'Usually instant', cost:'£10 to £24 a month',
  need:['Confirmation you receive Universal Credit or another means-tested benefit'],
  steps:['Check the Ofcom social tariff list for providers in your area.','Contact the provider and ask for their social tariff by name (BT Home Essentials, Sky Basics, Virgin Essential and so on).','They verify your benefit status directly with DWP in most cases.','Switch: providers must not charge exit fees to move onto a social tariff.'],
  boost:['Only 8.6% of eligible households take one up and 70% do not know they exist: check every provider in your area, not just your current one.','Mobile social tariffs exist too: SMARTY £12, VOXI For Now £10, EE Basics £12, O2 Essential £10.'],
  watch:'The account holder must be the person receiving the benefit. If you have no recourse, look at Community Fibre or 4th Utility instead.'
},
'water-income-tariffs': {
  time:'30 minutes', decision:'2 to 6 weeks', cost:'Free',
  need:['Proof of household income','Your water account number','Details of everyone in the household'],
  steps:['Find your water company (it is on your bill) and search its social tariff by name: WaterHelp, Big Difference, Back on Track, WaterSupport, LITE or Essentials.','Apply with income evidence: these schemes are income-tested only, with no benefit requirement.','If your bill is more than 5% of your net income, say so: several schemes trigger on that alone.'],
  boost:['Ask about debt matching at the same time: United Utilities matches £1 for £1 and then £2 for £1 against a kept payment plan; Yorkshire\'s trust clears up to £1,500 of arrears.','Join the Priority Services Register while you are on the phone: free, need-based, and it covers limited English or a child under 5.','Order free water-saving devices from GetWaterFit.'],
  watch:'WaterSure is a different scheme and needs a qualifying benefit: do not confuse it with the income-based tariffs, which are open to NRPF households.'
},

/* ---------- energy ---------- */
'bg-energy-trust': {
  time:'2 hours including the advice session', decision:'6 to 12 weeks', cost:'Free',
  need:['A money advice session completed in the last 6 months','Energy account details and debt balance','Income and expenditure statement','Bank statements'],
  steps:['FIRST book a money advice session with Citizens Advice, StepChange or a local advice agency. The Trust checks this.','Get the adviser to complete a full income and expenditure statement with you.','Apply on the British Gas Energy Trust website for the Individual and Families Fund.','Attach the advice session evidence, your energy debt figures and your budget.','Grants clear energy debt up to £1,700.'],
  boost:['You do NOT need to be a British Gas customer: any supplier\'s customers can apply.','The income route qualifies you without any benefit: household income under £20,328.','Apply with the most recent statement of your debt: stale figures slow the decision.'],
  watch:'Applying before the money advice session. It is a hard requirement and applications without it are rejected. Also: no second grant within 2 years.'
},
'fuel-bank-vouchers': {
  time:'One appointment', decision:'Same day', cost:'Free',
  need:['Your prepayment meter details','Nothing about your immigration status'],
  steps:['Get a referral from a food bank, council, Citizens Advice or another advice agency.','They issue a Fuel Bank Foundation voucher: £49, or £89 in winter.','Take the code to a PayPoint or Post Office to top up your meter.'],
  boost:['Ask for a fuel voucher at your food bank appointment: many people take the food and never ask about fuel.','Vouchers are repeatable, so ask what the local rules are on how often.'],
  watch:'This is for prepayment meters. If you are on a credit meter, ask about your supplier\'s hardship fund instead.'
},
'warm-homes-local-grant': {
  time:'30 minutes to register interest', decision:'Weeks to months', cost:'Free',
  need:['Your EPC rating (check the EPC register)','Proof of income or your postcode','Landlord consent if you rent'],
  steps:['Check your council\'s Warm Homes or ECO4 LA Flex pages.','Register interest: qualifying routes include income around £36,000 or less, an eligible postcode, or a cold-related health condition.','A surveyor assesses the property.','Work is installed free: insulation, heating upgrades, or a £7,500 heat pump grant through the Boiler Upgrade Scheme.'],
  boost:['The income and postcode routes need no benefit at all, which is what makes them work for NRPF households.','If you rent, get your landlord\'s written consent early: it is the usual hold-up.','ECO4 runs only to 31 December 2026, so register now if your property qualifies.'],
  watch:'Never pay an agent to "arrange" a grant. Councils and accredited installers do it free.'
},
'warm-home-discount': {
  time:'Nothing to do', decision:'Automatic, credited by March', cost:'Free',
  need:['Nothing: it is matched from benefit data'],
  steps:['If you receive a qualifying means-tested benefit, the £150 is applied to your electricity account automatically.','Check your account in the winter: it appears as a credit.','If you think you qualify and nothing arrives, contact your supplier.'],
  boost:['Make sure the benefit claimant is the named account holder on the energy bill: mismatches are the main reason the match fails.'],
  watch:'It is now purely benefit-based, so there is no application route. If you have no recourse, look at supplier hardship funds and the British Gas Energy Trust instead.'
},

/* ---------- charity ---------- */
'turn2us-grants': {
  time:'20 minutes to search, then per-fund applications', decision:'Varies by fund', cost:'Free',
  need:['Your occupation history','Your nationality and location','Details of your situation'],
  steps:['Go to the Turn2us grants search.','Enter your occupation, former occupations, nationality, location and circumstances.','It matches you across 1,700+ charitable funds.','Apply to each fund that fits: each sets its own rules and forms.'],
  boost:['Enter EVERY job you or your partner have ever done, including outside the UK: trade charities match on occupational history and people miss funds by listing only their current job.','Try your nationality too: some funds exist for people from specific countries.','Grants are gifts, not loans, and are never repaid.'],
  watch:'The search has no immigration test, but individual funds set their own rules. Read each fund\'s criteria before applying.'
},
'buttle-uk': {
  time:'A conversation with a professional', decision:'Around 6 weeks', cost:'Free',
  need:['A frontline professional willing to apply for you','Details of the crisis','What the child specifically needs'],
  steps:['Find a frontline professional who knows your family: a school family liaison worker, health visitor, social worker, or charity caseworker.','Ask them to apply to Buttle UK for a Chances for Children grant. Families cannot apply directly.','Be specific about the items: a bed, a laptop, uniform, a cooker, activity costs.','Awards go up to £2,400 per child.'],
  boost:['Your child\'s school is often the easiest referrer and already knows your situation.','Frame it around the child\'s wellbeing and education: that is what the fund is for.','Any immigration status is accepted.'],
  watch:'There is no direct application route. If a professional says they cannot, ask another: schools, health visitors and charities can all refer.'
},
'benevolent-funds': {
  time:'1 hour', decision:'2 to 8 weeks', cost:'Free',
  need:['Evidence of your work in the sector','Bank statements','Details of your financial need'],
  steps:['Identify your trade\'s charity: Hospitality Action for hospitality, The Care Workers Charity for any paid care role, and so on.','Check the work requirement: usually current work in the sector, or a number of years in it.','Apply on the charity\'s site with evidence of employment and need.','Care Workers Charity grants typically run around £500.'],
  boost:['Health and Care visa holders: The Care Workers Charity covers any paid UK care role, and no immigration conditions are published.','Check past jobs too: Hospitality Action covers people with 7 years in the industry even if they have left it.','Use the Turn2us search to find the charity for your trade if you do not know it.'],
  watch:'Nothing specific: these are occupational funds and the main barrier is simply not knowing yours exists.'
},

/* ---------- transport ---------- */
'railcard-16-25': {
  time:'10 minutes', decision:'Instant for digital', cost:'£35 for the year',
  need:['A passport from any country, or other accepted ID','A digital photo','Payment card'],
  steps:['Go to the 16-25 Railcard site (or 26-30, 16-17 Saver, or Senior depending on your age).','Upload a photo and your ID: any country\'s passport is accepted.','Pay £35 and get the digital card instantly.','Add it to your phone and to your ticket app so the discount applies automatically.'],
  boost:['Mature full-time students over 25 qualify for the 16-25 card: check your student status, not just your age.','Average saving is £212 a year, so it pays for itself in a few journeys.','Buy a 3-year card if it is offered: it is cheaper per year.','Always add the railcard to the booking BEFORE paying: it cannot be applied afterwards.'],
  watch:'Travelling before 10am on weekdays with a 16-25 card has a minimum fare rule. Check before you rely on it for a commute.'
},
'student-oyster': {
  time:'20 minutes', decision:'Up to 2 weeks for the card', cost:'£20 admin fee',
  need:['Your university enrolment details','A digital photo','Your London term-time address'],
  steps:['Apply through the TfL 18+ Student Oyster page.','Your university confirms your enrolment: you need 15+ structured hours a week and a London address in term time.','Pay the £20 fee.','The card arrives by post: 30% off travelcards and season tickets.'],
  boost:['International students routinely qualify: enrolment is the test, not immigration status.','Buy monthly or longer travelcards: the 30% applies to season tickets, not pay-as-you-go single fares.','Apply at the start of the year: the saving compounds over every month you hold it.'],
  watch:'Under-18s use a Zip card instead, and under-11s travel free.'
},
'scotland-under22-bus': {
  time:'20 minutes', decision:'2 to 3 weeks', cost:'Free',
  need:['Proof of age','A photo','Your Scottish address'],
  steps:['Apply at getyournec.scot for a National Entitlement Card.','If you are an asylum seeker, you can apply via your council using your ARC card.','The card arrives by post: free bus travel anywhere in Scotland for ages 5 to 21.'],
  boost:['Transport Scotland explicitly includes asylum seekers and people with no recourse: do not be put off.','Apply for every child in the household aged 5 and over.'],
  watch:'Nothing: this is one of the most openly available schemes in the UK.'
},

/* ---------- money ---------- */
'basic-bank-account': {
  time:'30 minutes', decision:'Same day to 2 weeks', cost:'Free',
  need:['Passport or eVisa share code','Some proof of address if you have it'],
  steps:['Pick one of the nine designated banks, or try Monzo or Starling which open accounts in-app.','Say clearly that you want a BASIC BANK ACCOUNT: it is fee-free, has a debit card, and has no credit check barrier.','Provide your passport or eVisa share code.','If you have no fixed address, ask HSBC about its No Fixed Address route.'],
  boost:['Ask for the "basic bank account" by name. Branch staff often steer people to standard accounts that they then fail the checks for.','Banks must offer these to anyone legally resident who fails normal eligibility: it is a legal duty, not a favour.','A letter from a charity, hostel or employer is often accepted as address evidence.'],
  watch:'Being refused once is not the end. Try a different designated bank, or a credit union, which accepts flexible ID including ARC cards.'
},
'lisa': {
  time:'20 minutes', decision:'Account opens same day', cost:'Free',
  need:['National Insurance number','Proof of ID','UK address','Age 18 to 39'],
  steps:['Choose a Lifetime ISA provider (cash or stocks and shares).','Open the account: you need only UK residence, an NI number, and to be 18 to 39.','Pay in up to £4,000 a year.','The government adds 25%: up to £1,000 a year free.','Use it for a first home under £450,000, or from age 60.'],
  boost:['Open one before your 40th birthday even if you only put in £1: you can keep paying in until 50 once it is open.','Pay in before 5 April to capture that tax year\'s bonus.','No immigration condition beyond residence: this is one of the few wealth-building routes fully open under NRPF.'],
  watch:'Withdrawing for anything other than a first home or age 60 costs a 25% penalty, which is more than the bonus you received.'
},
'help-to-save': {
  time:'15 minutes', decision:'Instant', cost:'Free',
  need:['A Universal Credit claim with £1+ of earnings that month','Government Gateway login'],
  steps:['Open the account on GOV.UK.','Save between £1 and £50 a month.','You get a 50% bonus after 2 years, and again after 4.','Maximum bonus £1,200 over 4 years.'],
  boost:['You keep the account even if you stop claiming Universal Credit later: open it while you are eligible.','Save the full £50 a month if you can: the bonus is calculated on your highest balance.'],
  watch:'It is Universal Credit gated, so it is closed under NRPF. If your status changes and you gain recourse, open it then.'
},

/* ---------- business ---------- */
'start-up-loans': {
  time:'Several hours over a few weeks', decision:'Weeks', cost:'Free to apply; 7.5% fixed on the loan',
  need:['Business plan','Cash flow forecast','Personal survival budget','Credit history','Proof of your immigration status'],
  steps:['Check your visa category first: Tier 1, Tier 2 (including sponsored Skilled Workers), Tier 4 students and Tier 5 are excluded. Confirm with the delivery partner.','Register on the Start Up Loans site and get matched with a delivery partner.','Work with their free pre-application support to build the business plan and forecasts.','Submit for credit assessment.','If approved: £500 to £25,000 at 7.5% fixed, plus 12 months of free mentoring.'],
  boost:['Use the free business-plan review before submitting: it is included and it materially improves approval odds.','People with no recourse to public funds are explicitly eligible: this is a loan, not a public fund.','If you have a time-limited visa, structure the term so the loan is fully repaid at least 6 months before your visa expires.','No indefinite leave to remain is required.'],
  watch:'It is a personal loan, not business finance: you are personally liable if the business fails.'
},

/* ---------- public funds tier ---------- */
'universal-credit': {
  time:'1 hour', decision:'First payment about 5 weeks', cost:'Free',
  need:['Bank details','Housing costs and tenancy agreement','Childcare receipts if relevant','ID and immigration documents','National Insurance number'],
  steps:['Claim on GOV.UK. Free help is available on 0800 144 8 444.','Complete the online claim and book your first Jobcentre appointment.','Verify your identity and attend the appointment.','Accept your claimant commitment.','First payment lands about 5 weeks later.'],
  boost:['Claim the DAY your entitlement starts: there is no general backdating and every day of delay is money gone.','Ask for an advance from day one if the 5-week wait is unmanageable: repayable over 24 months.','Report childcare costs in the assessment period you actually paid them, or you lose the 85% reimbursement.','The two-child limit was abolished in April 2026: every child counts now.'],
  watch:'Savings must be under £16,000. Refugees should claim on the day status is granted, not when the paperwork settles.'
},
'child-benefit': {
  time:'20 minutes', decision:'Up to 12 weeks for a first claim', cost:'Free',
  need:['Your child\'s birth or adoption certificate','Your National Insurance number','Bank details'],
  steps:['Claim online on GOV.UK or complete form CH2.','Send the original birth certificate if asked: it is returned.','Payment is £27.05 a week for the eldest child and £17.90 for each additional child.'],
  boost:['Backdate 3 months in the same claim: always tick it.','Claim even if you earn over £60,000 and opt out of payments: it protects your National Insurance credits toward the State Pension.','Nationals of 11 reciprocal-agreement countries, including Canada, New Zealand and Mauritius, can claim despite NRPF: check whether yours is on the list.'],
  watch:'The High Income Charge starts at £60,000 and claws the whole amount back by £80,000, paid through PAYE.'
},
'council-tax-reduction': {
  time:'30 minutes', decision:'2 to 8 weeks', cost:'Free',
  need:['Income and savings evidence','Tenancy agreement','Council tax account number'],
  steps:['Apply through your council: every council runs its own scheme.','Submit income, savings and household evidence.','Reduction can be up to 100% of the bill.'],
  boost:['Ask for backdating: many councils allow between 1 and 6 months.','Apply for the composition discounts at the same time (single person, student, disregarded occupants): they are separate and can stack.'],
  watch:'This is a public fund and blocked under NRPF. If you have no recourse, apply for the student exemption or single person discount instead, or ask about a discretionary section 13A hardship reduction, which sits outside the public funds list.'
},
'pension-credit': {
  time:'30 minutes', decision:'Up to 6 weeks', cost:'Free',
  need:['National Insurance number','Income and pension details','Savings and investment details','Bank details'],
  steps:['Claim on GOV.UK or ring the Pension Credit claim line.','Report all income, pensions and savings.','It tops your income up to £238.00 a week single, £363.25 a couple.'],
  boost:['Apply even if you think you are just over the limit: about 900,000 eligible pensioners never claim, leaving roughly £3bn unclaimed.','Even £1 a week of Pension Credit passports you to the Warm Home Discount, a free TV licence at 75, and Cold Weather Payments. The passported help is often worth more than the award.','Backdate 3 months in the same claim.'],
  watch:'Underclaiming because of a small private pension. The calculation is more generous than most people expect.'
},
'pip': {
  time:'Several hours over 2 to 3 weeks', decision:'Median 18 weeks', cost:'Free',
  need:['A 7-day symptom diary','Medical evidence: GP letters, consultant reports, prescriptions','A list of every difficulty with daily living and getting around','Details of aids and adaptations you use'],
  steps:['Ring the PIP claim line to start the claim: the date you ring is your claim date.','Complete the "How your disability affects you" form. Take your time: this is the whole claim.','For each activity, describe a bad day, how long tasks take, and what happens afterwards.','Attach professional evidence.','Attend the assessment if you are asked to.','If refused, request a mandatory reconsideration, then appeal.'],
  boost:['Give real, specific examples per descriptor: "I dropped a full pan twice last month" beats "I struggle with cooking".','Use the 50% rule: if you cannot do something safely, repeatedly and in reasonable time on more than half of days, you cannot do it. Say that explicitly.','Keep a 7-day diary before you write the form and quote from it.','New claim award rate is 37%, but most refusals that are challenged are overturned at appeal: do not stop at the first no.','Pre-settled status holders CAN claim disability benefits: there is no right-to-reside test for these.'],
  watch:'Describing your best day. Assessors record what you say literally, and a good day on paper becomes a refusal.'
},
'carers-allowance': {
  time:'30 minutes', decision:'3 to 6 weeks', cost:'Free',
  need:['Details of the person you care for and their benefit','Your earnings details','Your National Insurance number'],
  steps:['Check the person you care for gets a qualifying disability benefit such as PIP daily living.','Confirm you provide 35+ hours of care a week.','Claim on GOV.UK. It pays £86.45 a week.','In Scotland, claim Carer Support Payment instead: it also pays a £304.65 supplement twice a year.'],
  boost:['Watch the earnings limit closely: £204 a week net. Going £1 over loses the entire week\'s payment.','Pension contributions and some care costs are deducted before the earnings test: use them to stay under.','If you are on Universal Credit, the carer element (£209.34 a month) has no earnings limit at all: check which is better.'],
  watch:'Claiming Carer\'s Allowance can reduce the benefits of the person you care for. Check the whole household position first.'
},
'scottish-child-payment': {
  time:'30 minutes', decision:'Usually within 3 weeks', cost:'Free',
  need:['Your child\'s details','Your qualifying benefit details','Bank details','Scottish address'],
  steps:['Apply at mygov.scot or ring Social Security Scotland.','You need a qualifying benefit such as Universal Credit.','It pays £28.20 a week per child under 16.'],
  boost:['Take-up is already 94%, so the system works: apply as soon as your Universal Credit claim is live.','Apply for Best Start Grant and Best Start Foods on related forms at the same time.','It is paid per child with no cap.'],
  watch:'It is a public fund, so it needs recourse. Best Start Foods is the NRPF-safe Scottish alternative.'
},
'refugee-integration-loan': {
  time:'45 minutes', decision:'Several weeks', cost:'Free to apply; repayable',
  need:['Proof of refugee status or humanitarian protection','Bank details','Details of what the loan is for'],
  steps:['Apply through the Home Office integration loan scheme.','Set out what the money is for: housing deposit, training, work equipment.','If approved, repayments are set at an affordable rate.'],
  boost:['Be specific about how the loan leads to work or stable housing: that is what the scheme funds.','Get free advice from the British Red Cross refugee services before applying: they know what these applications need.'],
  watch:'It is a loan and must be repaid. Check charitable grants through Turn2us first: those are gifts.'
},
'ukraine-interim-200': {
  time:'One conversation', decision:'Days', cost:'Free',
  need:['Proof of arrival under a Ukraine scheme'],
  steps:['Contact your host council on arrival.','Ask about the interim subsistence payment.','It is a one-off £200 per person to cover immediate costs.'],
  boost:['Claim Universal Credit on the same day you arrive: Ukraine scheme arrivals qualify immediately with no habitual residence test.','Ukraine scheme holders have FULL homelessness rights: do not let a council treat you as having no recourse.'],
  watch:'The £200 is interim help only. The real money is Universal Credit, so start that claim straight away.'
},
's95-asylum-support': {
  time:'1 to 2 hours', decision:'Days to weeks', cost:'Free',
  need:['Your asylum claim reference','Evidence you are destitute','Details of anyone dependent on you'],
  steps:['Complete the ASF1 form with help from a support organisation such as Migrant Help.','Ring Migrant Help free on 0808 8010 503: they complete it with you.','Submit with evidence of destitution.','Support is paid onto an ARC card, with accommodation if you need it.'],
  boost:['Ask about section 98 emergency support while the section 95 decision is pending: you should not be left with nothing.','Your ARC card unlocks other things: free NHS prescriptions via HC2, Scotland\'s free bus travel, and many food banks and charities.','Ask for a maternity payment if you are pregnant.'],
  watch:'Do not wait until you are completely without money. Applying takes time and section 98 exists to bridge the gap.'
}
};
