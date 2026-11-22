import { queryOptions } from "@tanstack/react-query";
import { getCv } from "./cv.functions";

export const cvQueryOptions = queryOptions({
  queryKey: ["cv"],
  queryFn: () => getCv(),
});
