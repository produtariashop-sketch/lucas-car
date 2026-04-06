export type StatusOrcamento = 'pendente' | 'aprovado' | 'rejeitado' | 'concluido'

export interface Config {
  id: string
  pin_hash: string
  nome_empresa: string
  logo_url: string | null
  telefone: string | null
  endereco: string | null
  cnpj: string | null
  email: string | null
  cores_marca: { primaria: string; secundaria: string }
  updated_at: string
}

export interface Servico {
  id: string
  nome: string
  descricao: string | null
  valor_padrao: number
  prazo_dias: number
  ativo: boolean
  created_at: string
}

export interface Cliente {
  id: string
  nome: string
  telefone: string | null
  email: string | null
  endereco: string | null
  cpf_cnpj: string | null
  created_at: string
}

export interface Veiculo {
  id: string
  cliente_id: string | null
  marca: string
  modelo: string
  ano: string | null
  cor: string | null
  placa: string | null
  created_at: string
  clientes?: Pick<Cliente, 'id' | 'nome'> | null
}

export interface OrcamentoItem {
  id: string
  orcamento_id: string
  servico_id: string | null
  descricao: string
  quantidade: number
  valor_unitario: number
  valor_total: number
  created_at: string
}

export interface Orcamento {
  id: string
  cliente_id: string | null
  veiculo_id: string | null
  status: StatusOrcamento
  observacoes: string | null
  validade_dias: number
  desconto: number
  valor_total: number
  created_at: string
  updated_at: string
  clientes?: Pick<Cliente, 'id' | 'nome' | 'telefone'> | null
  veiculos?: Pick<Veiculo, 'id' | 'marca' | 'modelo' | 'ano' | 'placa'> | null
}
