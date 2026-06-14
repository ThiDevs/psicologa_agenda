export type CepAddress = {
  zipCode: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
};

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

export function onlyCepDigits(value: string) {
  return value.replace(/\D/g, '').slice(0, 8);
}

export function formatCep(value: string) {
  const digits = onlyCepDigits(value);

  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export async function lookupCep(value: string): Promise<CepAddress> {
  const digits = onlyCepDigits(value);

  if (digits.length !== 8) {
    throw new Error('Informe um CEP com 8 dígitos.');
  }

  let response: Response;

  try {
    response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  } catch {
    throw new Error('Não foi possível consultar o CEP agora.');
  }

  if (!response.ok) {
    throw new Error('Não foi possível consultar o CEP agora.');
  }

  const payload = (await response.json()) as ViaCepResponse;

  if (payload.erro) {
    throw new Error('CEP não encontrado. Confira os números ou preencha o endereço manualmente.');
  }

  return {
    zipCode: formatCep(payload.cep ?? digits),
    address: payload.logradouro?.trim() ?? '',
    neighborhood: payload.bairro?.trim() ?? '',
    city: payload.localidade?.trim() ?? '',
    state: payload.uf?.trim().toUpperCase() ?? '',
  };
}
