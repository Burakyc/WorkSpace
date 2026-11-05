# Development container for the API only (phase 0.7). Built by `npm run docker:api` at the repo root.

# Build: restore first (cached while the project file does not change), then publish.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Directory.Build.props ./
COPY DevPath.Api/DevPath.Api.csproj DevPath.Api/
RUN dotnet restore DevPath.Api/DevPath.Api.csproj
COPY DevPath.Api/ DevPath.Api/
RUN dotnet publish DevPath.Api/DevPath.Api.csproj -c Release --no-restore -p:DebugType=None -o /app

# Run: ASP.NET runtime only, as the image's non-root "app" user.
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app ./
ENV DEVPATH_IN_CONTAINER=1 \
    ASPNETCORE_ENVIRONMENT=Production \
    DEVPATH_DATA_DIR=/data
USER $APP_UID
ENTRYPOINT ["dotnet", "DevPath.Api.dll"]
