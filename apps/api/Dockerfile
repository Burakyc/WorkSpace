# Development container for the API only (phase 0.7). Built by `npm run docker:api` with the repo root as the
# context, because the API embeds the import schemas from schemas/.

# Build: restore first (cached while the project file does not change), then publish.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY apps/api/Directory.Build.props apps/api/
COPY apps/api/DevPath.Api/DevPath.Api.csproj apps/api/DevPath.Api/
RUN dotnet restore apps/api/DevPath.Api/DevPath.Api.csproj
COPY schemas/ schemas/
COPY apps/api/DevPath.Api/ apps/api/DevPath.Api/
RUN dotnet publish apps/api/DevPath.Api/DevPath.Api.csproj -c Release --no-restore -p:DebugType=None -o /app

# Run: ASP.NET runtime only, as the image's non-root "app" user.
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app ./
# ASPNETCORE_HTTP_PORTS is cleared because the API picks its own address and DEVPATH_PORT.
ENV DEVPATH_IN_CONTAINER=1 \
    ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_HTTP_PORTS= \
    DEVPATH_DATA_DIR=/data
USER $APP_UID
ENTRYPOINT ["dotnet", "DevPath.Api.dll"]
