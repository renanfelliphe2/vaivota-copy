// Telas e rotas do MVP do Festival (júri, voto infantil e totem, modo apresentação, galeria de dev) ficam fora do
// MVP da Semana Tech: `NEXT_PUBLIC_MODULOS_FESTIVAL` é embutida no build e, desligada (o padrão), essas rotas dão 404
// e os atalhos somem. Os arquivos continuam no repositório para o Festival reaproveitar.

export const MODULOS_FESTIVAL = process.env.NEXT_PUBLIC_MODULOS_FESTIVAL === "true";
