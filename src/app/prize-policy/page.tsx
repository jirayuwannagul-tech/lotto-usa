import Link from "next/link"

export default function PrizePolicyPage() {
  return (
    <div className="min-h-screen bg-[#09090b] px-5 py-10 text-white sm:px-6 sm:py-14">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-3xl border border-[#c9a84c]/20 bg-[#0d0d0d] p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.24em] text-[#c9a84c]">LOTTO USA</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">นโยบายการรับรางวัล</h1>
              <p className="mt-2 text-sm text-white/40">วิธีการรับเงินรางวัลและขั้นตอนที่ต้องปฏิบัติ</p>
            </div>
            <Link href="/" className="text-sm font-semibold text-white/40 transition hover:text-white">
              ← หน้าแรก
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#0d0d0d] p-8 space-y-8">
          <PolicySection
            number="01"
            title="เมื่อถูกรางวัล"
            body="เมื่อระบบตรวจพบว่าเลขที่คุณซื้อตรงกับผลลอตเตอรี่ ทีมงานจะติดต่อกลับหาคุณผ่านทางอีเมลหรือช่องทางที่ลงทะเบียนไว้ ภายใน 24–48 ชั่วโมงหลังประกาศผลอย่างเป็นทางการ"
          />
          <PolicySection
            number="02"
            title="รางวัลขนาดเล็ก (ต่ำกว่า $600)"
            body="รางวัลที่มีมูลค่าต่ำกว่า $600 USD ทีมงานจะโอนเงินเป็นบาทไทยตามอัตราแลกเปลี่ยน ณ วันที่ได้รับรางวัล เข้าบัญชีธนาคารที่คุณแจ้งไว้ หรือเข้า Wallet ในระบบ ภายใน 7 วันทำการ"
          />
          <PolicySection
            number="03"
            title="รางวัลขนาดกลาง ($600–$50,000)"
            body="รางวัลในช่วงนี้ต้องยื่นเอกสารผ่านตัวแทนของเราในสหรัฐอเมริกา ใช้เวลาดำเนินการประมาณ 14–30 วัน ทีมงานจะแนะนำขั้นตอนและเอกสารที่ต้องใช้เป็นรายกรณี"
          />
          <PolicySection
            number="04"
            title="รางวัลใหญ่ (เกิน $50,000)"
            body="รางวัลมูลค่าสูงต้องดำเนินการผ่านทนายความและบริษัทที่ปรึกษาด้านภาษีในสหรัฐฯ ทีมงานจะประสานงานให้ครบถ้วน อาจใช้เวลา 30–90 วัน ขึ้นอยู่กับมูลค่ารางวัลและกฎหมายของรัฐนั้น"
          />
          <PolicySection
            number="05"
            title="ค่าธรรมเนียมและภาษี"
            body="รางวัลทุกรายการมีภาษีหัก ณ ที่จ่ายของสหรัฐอเมริกา ซึ่งอาจสูงถึง 37% สำหรับรางวัลใหญ่ รวมถึงอาจมีภาษีเพิ่มเติมจากรัฐ ทีมงานจะแจ้งยอดสุทธิที่จะได้รับก่อนดำเนินการทุกครั้ง"
          />
          <PolicySection
            number="06"
            title="อายุของตั๋ว"
            body="ตั๋วลอตเตอรี่ Powerball มีอายุการยื่นขอรับรางวัล 1 ปีนับจากวันออกรางวัล ส่วน Mega Millions มีอายุระหว่าง 180 วัน ถึง 1 ปี ขึ้นอยู่กับรัฐที่ซื้อ ทีมงานจะดูแลและแจ้งเตือนให้คุณทราบ"
          />
          <PolicySection
            number="07"
            title="การยืนยันตัวตน"
            body="ลูกค้าต้องส่งสำเนาบัตรประชาชน หรือหนังสือเดินทางที่ยังไม่หมดอายุ เพื่อใช้ในการยื่นเรื่องรับรางวัล ข้อมูลทั้งหมดจะถูกเก็บรักษาอย่างปลอดภัยตามนโยบายความเป็นส่วนตัวของเรา"
          />
        </section>

        <section className="rounded-3xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-8">
          <p className="text-sm font-semibold text-[#c9a84c]">มีคำถามเพิ่มเติม?</p>
          <p className="mt-2 text-sm text-white/60 leading-7">
            ติดต่อทีมงานได้ทางช่องทางที่ระบุไว้ในหน้าหลัก หรือสอบถามผ่าน Line ID ที่ลงทะเบียนไว้ในบัญชีของคุณ
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex rounded-xl bg-[#c9a84c] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#d4b860]"
          >
            กลับหน้าหลัก
          </Link>
        </section>
      </div>
    </div>
  )
}

function PolicySection({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div className="flex gap-6">
      <div className="shrink-0 w-10 h-10 rounded-full border border-[#c9a84c]/30 flex items-center justify-center">
        <span className="text-xs font-bold text-[#c9a84c]">{number}</span>
      </div>
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm leading-7 text-white/50">{body}</p>
      </div>
    </div>
  )
}
