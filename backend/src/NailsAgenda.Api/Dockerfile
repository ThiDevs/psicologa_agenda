FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Directory.Build.props ./
COPY src/NailsAgenda.Domain/NailsAgenda.Domain.csproj src/NailsAgenda.Domain/
COPY src/NailsAgenda.Application/NailsAgenda.Application.csproj src/NailsAgenda.Application/
COPY src/NailsAgenda.Infrastructure/NailsAgenda.Infrastructure.csproj src/NailsAgenda.Infrastructure/
COPY src/NailsAgenda.Api/NailsAgenda.Api.csproj src/NailsAgenda.Api/
RUN dotnet restore src/NailsAgenda.Api/NailsAgenda.Api.csproj

COPY src ./src
RUN dotnet publish src/NailsAgenda.Api/NailsAgenda.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "NailsAgenda.Api.dll"]
