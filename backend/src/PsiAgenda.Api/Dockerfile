FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Directory.Build.props ./
COPY src/PsiAgenda.Domain/PsiAgenda.Domain.csproj src/PsiAgenda.Domain/
COPY src/PsiAgenda.Application/PsiAgenda.Application.csproj src/PsiAgenda.Application/
COPY src/PsiAgenda.Infrastructure/PsiAgenda.Infrastructure.csproj src/PsiAgenda.Infrastructure/
COPY src/PsiAgenda.Api/PsiAgenda.Api.csproj src/PsiAgenda.Api/
RUN dotnet restore src/PsiAgenda.Api/PsiAgenda.Api.csproj

COPY src ./src
RUN dotnet publish src/PsiAgenda.Api/PsiAgenda.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "PsiAgenda.Api.dll"]
