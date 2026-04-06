import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import type { Config } from '@/types/database'

type OrcamentoForPDF = {
  id: string
  created_at: string
  validade_dias: number
  desconto: number
  valor_total: number
  observacoes: string | null
  status: string
  clientes?: {
    nome: string
    telefone?: string | null
    email?: string | null
    endereco?: string | null
    cpf_cnpj?: string | null
  } | null
  veiculos?: {
    marca: string
    modelo: string
    ano?: string | null
    placa?: string | null
    cor?: string | null
  } | null
}

type ItemForPDF = {
  id: string
  descricao: string
  quantidade: number
  valor_unitario: number
  valor_total: number
  servicos?: { prazo_dias: number } | null
}

export interface OrcamentoPDFProps {
  orcamento: OrcamentoForPDF
  itens: ItemForPDF[]
  config: Config | null
}

const GREEN = '#00bb00'
const DARK = '#1a1a1a'
const GRAY = '#777777'
const LIGHT = '#f6f6f6'
const MID = '#e0e0e0'
const WHITE = '#ffffff'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: DARK,
    backgroundColor: WHITE,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: GREEN,
    borderBottomStyle: 'solid',
    paddingBottom: 14,
    marginBottom: 16,
  },
  logo: { width: 56, height: 56 },
  companyBlock: { flex: 1, marginLeft: 12 },
  companyName: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: GREEN, letterSpacing: 2 },
  companyLine: { fontSize: 9, color: GRAY, marginTop: 2 },
  // Quote ID row
  idRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  quoteTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: DARK },
  quoteId: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: GREEN },
  dateBlock: { alignItems: 'flex-end' },
  dateText: { fontSize: 9, color: GRAY },
  // Info boxes
  infoRow: { flexDirection: 'row', marginBottom: 16 },
  infoBox: { flex: 1, backgroundColor: LIGHT, borderRadius: 3, padding: 10, marginRight: 8 },
  infoBoxLast: { flex: 1, backgroundColor: LIGHT, borderRadius: 3, padding: 10 },
  infoTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
    letterSpacing: 1,
    marginBottom: 5,
  },
  infoLine: { fontSize: 9, color: DARK, marginBottom: 2 },
  infoSub: { fontSize: 8, color: GRAY },
  // Table
  tableHead: {
    flexDirection: 'row',
    backgroundColor: GREEN,
    borderRadius: 2,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 1,
  },
  tableHeadText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: MID,
    borderBottomStyle: 'solid',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRowAlt: { backgroundColor: '#fafafa' },
  tableCell: { fontSize: 9, color: DARK },
  colDesc: { flex: 3 },
  colQty: { flex: 0.8, textAlign: 'center' },
  colUnit: { flex: 1.5, textAlign: 'right' },
  colSub: { flex: 1.5, textAlign: 'right' },
  // Totals
  totalsWrap: { marginTop: 12, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', width: 230, marginBottom: 3 },
  totalLabel: { fontSize: 9, color: GRAY, flex: 1, textAlign: 'right', paddingRight: 12 },
  totalValue: { fontSize: 9, color: DARK, width: 80, textAlign: 'right' },
  totalDivider: {
    width: 230,
    borderBottomWidth: 1,
    borderBottomColor: MID,
    borderBottomStyle: 'solid',
    marginVertical: 4,
  },
  totalFinalRow: { flexDirection: 'row', width: 230 },
  totalFinalLabel: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: DARK, flex: 1, textAlign: 'right', paddingRight: 12 },
  totalFinalValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: GREEN, width: 80, textAlign: 'right' },
  // Bottom
  bottomRow: { flexDirection: 'row', marginTop: 20 },
  bottomBox: { flex: 1, backgroundColor: LIGHT, borderRadius: 3, padding: 10, marginRight: 8 },
  bottomBoxLast: { backgroundColor: LIGHT, borderRadius: 3, padding: 10, width: 140 },
  bottomTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: GREEN, letterSpacing: 1, marginBottom: 5 },
  bottomText: { fontSize: 9, color: DARK, lineHeight: 1.4 },
  prazoNum: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: DARK },
  prazoPeriod: { fontSize: 9, color: GRAY, marginTop: 2 },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: MID,
    borderTopStyle: 'solid',
    paddingTop: 8,
  },
  footerText: { fontSize: 8, color: GRAY },
  footerBrand: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: GREEN },
})

export function OrcamentoPDF({ orcamento, itens, config }: OrcamentoPDFProps) {
  const empresa = config?.nome_empresa ?? 'LUCASCAR'
  const emissao = new Date(orcamento.created_at).toLocaleDateString('pt-BR')
  const validade = new Date(
    new Date(orcamento.created_at).getTime() + orcamento.validade_dias * 86400000
  ).toLocaleDateString('pt-BR')

  const subtotal = itens.reduce((acc, i) => acc + Number(i.valor_total), 0)
  const desconto = Number(orcamento.desconto)
  const total = Number(orcamento.valor_total)
  const prazoDias = itens.reduce((acc, i) => acc + (i.servicos?.prazo_dias ?? 0), 0)
  const shortId = orcamento.id.slice(0, 8).toUpperCase()

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          {config?.logo_url && (
            <Image src={config.logo_url} style={s.logo} />
          )}
          <View style={[s.companyBlock, !config?.logo_url ? { marginLeft: 0 } : {}]}>
            <Text style={s.companyName}>{empresa.toUpperCase()}</Text>
            {config?.cnpj && <Text style={s.companyLine}>CNPJ: {config.cnpj}</Text>}
            {config?.telefone && <Text style={s.companyLine}>Tel: {config.telefone}</Text>}
            {config?.email && <Text style={s.companyLine}>{config.email}</Text>}
            {config?.endereco && <Text style={s.companyLine}>{config.endereco}</Text>}
          </View>
        </View>

        {/* ID / Date row */}
        <View style={s.idRow}>
          <View>
            <Text style={s.quoteTitle}>ORÇAMENTO</Text>
            <Text style={s.quoteId}>#{shortId}</Text>
          </View>
          <View style={s.dateBlock}>
            <Text style={s.dateText}>Emissão: {emissao}</Text>
            <Text style={s.dateText}>Válido até: {validade}</Text>
          </View>
        </View>

        {/* Client + Vehicle */}
        <View style={s.infoRow}>
          <View style={s.infoBox}>
            <Text style={s.infoTitle}>CLIENTE</Text>
            {orcamento.clientes ? (
              <>
                <Text style={s.infoLine}>{orcamento.clientes.nome}</Text>
                {orcamento.clientes.cpf_cnpj && (
                  <Text style={s.infoSub}>CPF/CNPJ: {orcamento.clientes.cpf_cnpj}</Text>
                )}
                {orcamento.clientes.telefone && (
                  <Text style={s.infoSub}>Tel: {orcamento.clientes.telefone}</Text>
                )}
                {orcamento.clientes.email && (
                  <Text style={s.infoSub}>{orcamento.clientes.email}</Text>
                )}
                {orcamento.clientes.endereco && (
                  <Text style={s.infoSub}>{orcamento.clientes.endereco}</Text>
                )}
              </>
            ) : (
              <Text style={s.infoSub}>Não informado</Text>
            )}
          </View>
          <View style={s.infoBoxLast}>
            <Text style={s.infoTitle}>VEÍCULO</Text>
            {orcamento.veiculos ? (
              <>
                <Text style={s.infoLine}>
                  {orcamento.veiculos.marca} {orcamento.veiculos.modelo}
                  {orcamento.veiculos.ano ? ` (${orcamento.veiculos.ano})` : ''}
                </Text>
                {orcamento.veiculos.cor && (
                  <Text style={s.infoSub}>Cor: {orcamento.veiculos.cor}</Text>
                )}
                {orcamento.veiculos.placa && (
                  <Text style={s.infoSub}>Placa: {orcamento.veiculos.placa}</Text>
                )}
              </>
            ) : (
              <Text style={s.infoSub}>Não informado</Text>
            )}
          </View>
        </View>

        {/* Items table */}
        <View style={s.tableHead}>
          <Text style={[s.tableHeadText, s.colDesc]}>DESCRIÇÃO</Text>
          <Text style={[s.tableHeadText, s.colQty]}>QTD</Text>
          <Text style={[s.tableHeadText, s.colUnit]}>VALOR UNIT.</Text>
          <Text style={[s.tableHeadText, s.colSub]}>SUBTOTAL</Text>
        </View>
        {itens.map((item, i) => (
          <View key={item.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
            <Text style={[s.tableCell, s.colDesc]}>{item.descricao}</Text>
            <Text style={[s.tableCell, s.colQty]}>{item.quantidade}</Text>
            <Text style={[s.tableCell, s.colUnit]}>{fmt(Number(item.valor_unitario))}</Text>
            <Text style={[s.tableCell, s.colSub]}>{fmt(Number(item.valor_total))}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={s.totalsWrap}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotal:</Text>
            <Text style={s.totalValue}>{fmt(subtotal)}</Text>
          </View>
          {desconto > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Desconto:</Text>
              <Text style={[s.totalValue, { color: '#cc0000' }]}>- {fmt(desconto)}</Text>
            </View>
          )}
          <View style={s.totalDivider} />
          <View style={s.totalFinalRow}>
            <Text style={s.totalFinalLabel}>TOTAL:</Text>
            <Text style={s.totalFinalValue}>{fmt(total)}</Text>
          </View>
        </View>

        {/* Bottom info */}
        <View style={s.bottomRow}>
          {prazoDias > 0 && (
            <View style={[s.bottomBox, { flex: 0.7 }]}>
              <Text style={s.bottomTitle}>PRAZO ESTIMADO</Text>
              <Text style={s.prazoNum}>{prazoDias}</Text>
              <Text style={s.prazoPeriod}>{prazoDias === 1 ? 'dia útil' : 'dias úteis'}</Text>
            </View>
          )}
          {orcamento.observacoes ? (
            <View style={s.bottomBox}>
              <Text style={s.bottomTitle}>OBSERVAÇÕES</Text>
              <Text style={s.bottomText}>{orcamento.observacoes}</Text>
            </View>
          ) : (
            <View style={s.bottomBox} />
          )}
          <View style={s.bottomBoxLast}>
            <Text style={s.bottomTitle}>VALIDADE</Text>
            <Text style={[s.bottomText, { fontFamily: 'Helvetica-Bold', fontSize: 11 }]}>{validade}</Text>
            <Text style={[s.bottomText, { color: GRAY, fontSize: 8, marginTop: 3 }]}>
              Válido por {orcamento.validade_dias} dias
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            Orçamento gerado por{' '}
            <Text style={s.footerBrand}>{empresa}</Text>
          </Text>
          <Text style={s.footerText}>{emissao}</Text>
        </View>
      </Page>
    </Document>
  )
}
