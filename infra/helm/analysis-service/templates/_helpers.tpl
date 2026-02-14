{{- define "analysis-service.fullname" -}}
{{- printf "%s-%s" .Release.Name "analysis-service" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

