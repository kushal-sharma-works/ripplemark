{{- define "topology-service.fullname" -}}
{{- printf "%s-%s" .Release.Name "topology-service" | trunc 63 | trimSuffix "-" -}}
{{- end -}}
