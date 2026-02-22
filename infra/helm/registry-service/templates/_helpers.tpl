{{- define "registry-service.fullname" -}}
{{- printf "%s-%s" .Release.Name "registry-service" | trunc 63 | trimSuffix "-" -}}
{{- end -}}
