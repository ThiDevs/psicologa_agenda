using Microsoft.Extensions.Options;
using PsiAgenda.Infrastructure.Services;

var tests = new (string Name, Action Run)[]
{
    ("protege e descriptografa texto clinico com envelope enc:v1", ProtectsAndRoundTripsClinicalText),
    ("nao cifra duas vezes um envelope ja protegido", DoesNotProtectAlreadyProtectedText),
    ("le texto legado em claro para migracao transparente", ReadsLegacyPlainText),
    ("falha ao abrir envelope com chave diferente", RejectsDifferentKey),
    ("declara fallback de desenvolvimento na politica", ReportsDevelopmentFallbackPolicy),
};

var failures = 0;

foreach (var test in tests)
{
    try
    {
        test.Run();
        Console.WriteLine($"ok - {test.Name}");
    }
    catch (Exception exception)
    {
        failures += 1;
        Console.Error.WriteLine($"fail - {test.Name}");
        Console.Error.WriteLine(exception.Message);
    }
}

if (failures > 0)
{
    Console.Error.WriteLine($"{failures} teste(s) falharam.");
    return 1;
}

Console.WriteLine($"{tests.Length} teste(s) passaram.");
return 0;

static void ProtectsAndRoundTripsClinicalText()
{
    var protector = CreateProtector("clinical-test-key");
    const string plainText = "Evolucao clinica sensivel com acentos, sinais e contexto privado.";

    var protectedText = protector.ProtectRequired(plainText);

    AssertTrue(protectedText.StartsWith("enc:v1:", StringComparison.Ordinal), "O envelope deve usar o prefixo enc:v1.");
    AssertTrue(protectedText != plainText, "O texto protegido nao pode ser igual ao texto original.");
    AssertTrue(protector.IsProtected(protectedText), "IsProtected deve reconhecer o envelope.");
    AssertEqual(plainText, protector.UnprotectRequired(protectedText), "O texto descriptografado deve ser identico ao original.");
}

static void DoesNotProtectAlreadyProtectedText()
{
    var protector = CreateProtector("clinical-test-key");
    var protectedText = protector.ProtectRequired("Rascunho clinico privado.");

    var protectedAgain = protector.ProtectRequired(protectedText);

    AssertEqual(protectedText, protectedAgain, "Envelope protegido nao deve ser cifrado novamente.");
}

static void ReadsLegacyPlainText()
{
    var protector = CreateProtector("clinical-test-key");
    const string legacyText = "Registro legado ainda em texto puro.";

    AssertTrue(!protector.IsProtected(legacyText), "Texto legado nao deve ser marcado como protegido.");
    AssertEqual(legacyText, protector.UnprotectRequired(legacyText), "Texto legado deve continuar legivel durante migracao.");
    AssertEqual(null, protector.UnprotectOptional(null), "Valor nulo opcional deve permanecer nulo.");
}

static void RejectsDifferentKey()
{
    var firstProtector = CreateProtector("clinical-test-key-a");
    var secondProtector = CreateProtector("clinical-test-key-b");
    var protectedText = firstProtector.ProtectRequired("Conteudo clinico protegido.");

    AssertThrows<InvalidOperationException>(
        () => secondProtector.UnprotectRequired(protectedText),
        "Envelope aberto com chave diferente deve falhar.");
}

static void ReportsDevelopmentFallbackPolicy()
{
    var protector = CreateProtector(null);
    var policy = protector.BuildPolicy();

    AssertTrue(policy.Enabled, "Politica deve informar protecao ativa.");
    AssertEqual("development_fallback", policy.KeySource, "Sem chave configurada, a politica deve declarar fallback de desenvolvimento.");
    AssertEqual("active_with_development_key", policy.Status, "Status deve deixar claro que a chave e apenas de desenvolvimento.");
    AssertTrue(policy.ProtectedFields.Contains("clinical_records.content_text"), "Politica deve listar prontuario aprovado como campo protegido.");
}

static ClinicalTextProtector CreateProtector(string? key)
{
    return new ClinicalTextProtector(Options.Create(new ClinicalDataProtectionOptions { Key = key }));
}

static void AssertEqual<T>(T expected, T actual, string message)
{
    if (!EqualityComparer<T>.Default.Equals(expected, actual))
    {
        throw new InvalidOperationException($"{message} Esperado: {expected}. Atual: {actual}.");
    }
}

static void AssertTrue(bool condition, string message)
{
    if (!condition)
    {
        throw new InvalidOperationException(message);
    }
}

static void AssertThrows<TException>(Action action, string message)
    where TException : Exception
{
    try
    {
        action();
    }
    catch (TException)
    {
        return;
    }

    throw new InvalidOperationException(message);
}
